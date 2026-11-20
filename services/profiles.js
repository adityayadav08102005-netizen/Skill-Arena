import "server-only";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Company, Profile, Skill } from "@/lib/db/models";
import { profileCompletion } from "@/lib/utils/profileCompletion";
import { XP_RULES } from "@/lib/utils/xp";
import { evaluateAchievements } from "./achievements";
import { logActivity, notify } from "./activity";
import { awardXp } from "./gamification";
import { forgetStaleHandles } from "./externalProfiles";

export class ProfileError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const oid = (id) => new ObjectId(String(id));
const plain = (doc) => (doc ? JSON.parse(JSON.stringify(doc)) : null);

function slugify(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 60) || "company";
}

export async function uniqueCompanySlug(name) {
  const base = slugify(name);
  for (let i = 0; i < 50; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await Company.exists({ slug }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * One-time setup after sign-up. Atomically claims the onboarding step (so it
 * can't be replayed to switch roles later), then sets the role on the auth
 * user. Recruiters get a new, unverified company owned by them.
 */
export async function completeOnboarding(user, data) {
  await connectToDatabase();
  const userId = oid(user.id);

  await Profile.updateOne(
    { userId },
    { $setOnInsert: { userId, fullName: user.name || user.email.split("@")[0] } },
    { upsert: true },
  );

  const update = { onboardingComplete: true };
  if (data.role === "student") {
    Object.assign(update, { college: data.college, graduationYear: data.graduationYear });
  } else {
    Object.assign(update, { jobTitle: data.jobTitle });
  }

  // An admin created with make-admin keeps that role; setup only fills in details.
  const existing = await mongoose.connection.collection("user").findOne({ _id: userId }, { projection: { role: 1 } });
  if (existing?.role === "admin") data = { ...data, role: "admin" };

  const claimed = await Profile.findOneAndUpdate(
    { userId, onboardingComplete: { $ne: true } },
    { $set: update },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) throw new ProfileError("Your account is already set up.", 409);

  if (data.role === "recruiter") {
    const company = await Company.create({
      name: data.companyName,
      slug: await uniqueCompanySlug(data.companyName),
      ownerId: userId,
      isVerified: false,
    });
    await Profile.updateOne({ userId }, { $set: { companyId: company._id } });
  }

  // Role is server-managed (input: false in Better Auth), so it is written directly.
  await mongoose.connection.collection("user").updateOne({ _id: userId }, { $set: { role: data.role } });

  await logActivity(userId, "account.onboarded", { metadata: { role: data.role } });
  await notify(userId, {
    type: "system",
    title: "Welcome to SkillArena",
    body: data.role === "recruiter" ? "Your recruiter account is ready." : "Complete your profile to earn 50 XP.",
    link: "/profile",
  });
  return { role: data.role };
}

/** Map skill names onto the shared catalogue, creating unknown ones. */
async function resolveSkills(items) {
  const seen = new Set();
  const unique = items.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const result = [];
  for (const item of unique) {
    const skill = await Skill.findOneAndUpdate(
      { name: item.name },
      { $setOnInsert: { name: item.name, category: "technical" } },
      { upsert: true, returnDocument: "after", collation: { locale: "en", strength: 2 } },
    ).lean();
    result.push({ skillId: skill._id, name: skill.name, proficiency: item.proficiency, source: "self", verified: false });
  }
  return result;
}

/**
 * Updates one validated section of the signed-in user's own profile and
 * awards the profile-completion XP the first time a student reaches 100%.
 */
export async function updateProfileSection(user, section, data) {
  await connectToDatabase();
  const userId = oid(user.id);
  let set;

  switch (section) {
    case "basics":
      set = { ...data };
      if (user.role !== "recruiter") delete set.jobTitle;
      break;
    case "skills":
      set = { skills: await resolveSkills(data.skills) };
      break;
    case "education":
    case "experience":
    case "projects":
      set = { [section]: data[section] };
      break;
    case "privacy":
      set = { isPublic: data.isPublic, visibility: data.visibility };
      break;
    case "goals":
      if (user.role !== "student") throw new ProfileError("Goals are for student accounts.", 403);
      set = { goals: data };
      break;
    default:
      throw new ProfileError("Unknown profile section.", 404);
  }

  // Optional fields left blank are cleared rather than kept.
  const unset = {};
  if (section === "basics") {
    for (const key of ["headline", "bio", "location", "college", "degree", "department", "graduationYear", "jobTitle", "githubUsername", "linkedinUrl", "codeforcesHandle"]) {
      if (set[key] === undefined) {
        delete set[key];
        if (!(key === "jobTitle" && user.role !== "recruiter")) unset[key] = "";
      }
    }
  }

  const profile = await Profile.findOneAndUpdate(
    { userId, onboardingComplete: true },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!profile) throw new ProfileError("Finish setting up your account first.", 409);

  if (section === "basics") await forgetStaleHandles(userId, profile); // new GitHub/Codeforces handle → fetch fresh stats
  await logActivity(userId, "profile.updated", { entityType: "profile", metadata: { section } });
  const xp = await maybeAwardCompletion(user, profile);
  return { profile: plain(profile), completion: profileCompletion(profile, user), xp };
}

export async function maybeAwardCompletion(user, profile) {
  if (user.role !== "student") return null;
  const { percent } = profileCompletion(profile, user);
  if (percent < 100) return null;
  const result = await awardXp(user.id, { amount: XP_RULES.profileComplete, reason: "profile_complete", refId: "profile" });
  await evaluateAchievements(user.id); // e.g. the "All set" badge
  return result.awarded ? result : null;
}

/** Set or clear a GridFS file reference (resume or avatar) on the user's profile. Returns the previous id. */
export async function setProfileFile(user, field, fileId) {
  await connectToDatabase();
  const before = await Profile.findOneAndUpdate(
    { userId: oid(user.id) },
    { $set: { [field]: fileId ? oid(fileId) : null } },
    { returnDocument: "before" },
  ).lean();
  const after = await Profile.findOne({ userId: oid(user.id) }).lean();
  await logActivity(user.id, fileId ? `profile.${field}.uploaded` : `profile.${field}.removed`, { entityType: "profile" });
  const xp = await maybeAwardCompletion(user, after);
  return { previous: before?.[field] ?? null, profile: plain(after), completion: profileCompletion(after, user), xp };
}

/**
 * Public view of a profile, filtered by the owner's privacy settings.
 * Owners and admins see everything. Returns null when not visible.
 */
export async function getPublicProfile(userId, viewer) {
  if (!ObjectId.isValid(userId)) return null;
  await connectToDatabase();
  const id = oid(userId);
  const profile = await Profile.findOne({ userId: id, onboardingComplete: true, isActive: true }).lean();
  if (!profile) return null;

  const authUser = await mongoose.connection.collection("user").findOne({ _id: id }, { projection: { email: 1, image: 1, role: 1, name: 1 } });
  const isOwner = viewer?.id === String(userId);
  const isAdmin = viewer?.role === "admin";
  if (!profile.isPublic && !isOwner && !isAdmin) return null;

  const see = (key) => isOwner || isAdmin || profile.visibility?.[key] !== false;
  const company = profile.companyId ? await Company.findById(profile.companyId, { name: 1, slug: 1, isVerified: 1 }).lean() : null;

  return plain({
    userId: String(userId),
    role: authUser?.role ?? "student",
    fullName: profile.fullName,
    hasAvatar: Boolean(profile.avatarFileId),
    image: authUser?.image ?? null,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,
    college: profile.college,
    degree: profile.degree,
    department: profile.department,
    graduationYear: profile.graduationYear,
    preferredRoles: profile.preferredRoles,
    jobTitle: profile.jobTitle,
    company,
    skills: profile.skills,
    xp: profile.xp,
    level: profile.level,
    skillLevel: profile.skillLevel,
    streak: profile.streak,
    email: isOwner || isAdmin || profile.visibility?.email === true ? authUser?.email ?? null : null,
    education: see("education") ? profile.education : null,
    experience: see("experience") ? profile.experience : null,
    projects: see("projects") ? profile.projects : null,
    githubUsername: see("github") ? profile.githubUsername : null,
    linkedinUrl: see("linkedin") ? profile.linkedinUrl : null,
    codeforcesHandle: profile.codeforcesHandle,
    showCodingStats: see("codingStats"),
    hasResume: Boolean(profile.resumeFileId) && see("resume"),
    isOwner,
  });
}
