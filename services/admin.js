import "server-only";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  ActivityLog,
  Application,
  AssessmentAttempt,
  Company,
  ContentReport,
  ContestParticipant,
  Opportunity,
  Problem,
  ProblemSubmission,
  Profile,
  Question,
} from "@/lib/db/models";
import { dayKey, shiftDay, weekStartKey } from "@/lib/utils/time";
import { logActivity, notify } from "./activity";
import { uniqueCompanySlug } from "./profiles";
import { notifyMatchingStudents } from "./recruiter";

export class AdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));
const users = () => mongoose.connection.collection("user");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PAGE = 25;

function validId(id, what = "Item") {
  if (!ObjectId.isValid(String(id))) throw new AdminError(`${what} not found.`, 404);
  return oid(id);
}

/** Every admin action is written to the activity log as `admin.*` (shown on the overview). */
async function audit(admin, action, entityType, entityId, metadata = {}) {
  await logActivity(admin.id, `admin.${action}`, { entityType, entityId, metadata });
}

// ── Overview ──────────────────────────────────────────────────────
const AUDIT_LABEL = {
  "admin.user_role": "changed a role",
  "admin.user_suspend": "suspended an account",
  "admin.user_restore": "restored an account",
  "admin.company_verify": "verified a company",
  "admin.company_reject": "declined a company",
  "admin.company_unverify": "removed a company's verification",
  "admin.listing_approve": "approved a listing",
  "admin.listing_reject": "sent a listing back",
  "admin.listing_take_down": "took down a listing",
  "admin.report_dismiss": "dismissed a report",
  "admin.report_action": "acted on a report",
  "admin.problem_create": "added a problem",
  "admin.problem_update": "edited a problem",
  "admin.problem_delete": "deleted a problem",
  "admin.question_create": "added a question",
  "admin.question_update": "edited a question",
  "admin.question_delete": "deleted a question",
  "admin.contest_create": "created a contest",
  "admin.contest_update": "edited a contest",
  "admin.contest_delete": "deleted a contest",
  "admin.integration_sync": "ran a job import",
};

export async function adminOverview() {
  await connectToDatabase();
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86_400_000);
  const monthAgo = new Date(now - 30 * 86_400_000);
  const firstWeek = shiftDay(weekStartKey(), 7 * 7); // shiftDay counts days back

  const [
    students,
    recruiters,
    newStudents,
    awaitingCompanies,
    problemsLive,
    problemDrafts,
    openRoles,
    pendingListings,
    openReports,
    recentSignups,
    submissions30,
    attempts30,
    applications30,
    contestEntries30,
    queueListings,
    queueCompanies,
    queueReports,
    auditTrail,
  ] = await Promise.all([
    users().countDocuments({ role: "student" }),
    users().countDocuments({ role: "recruiter" }),
    users().countDocuments({ role: "student", createdAt: { $gte: weekAgo } }),
    Company.countDocuments({ ownerId: { $ne: null }, isVerified: false, reviewedAt: null }),
    Problem.countDocuments({ isPublished: true }),
    Problem.countDocuments({ isPublished: false }),
    Opportunity.countDocuments({ status: "published" }),
    Opportunity.countDocuments({ status: "pending_review" }),
    ContentReport.countDocuments({ status: "open" }),
    users().find({ createdAt: { $gte: new Date(Date.now() - 60 * 86_400_000) } }, { projection: { createdAt: 1, role: 1 } }).toArray(),
    ProblemSubmission.countDocuments({ createdAt: { $gte: monthAgo } }),
    AssessmentAttempt.countDocuments({ status: { $in: ["submitted", "expired"] }, createdAt: { $gte: monthAgo } }),
    Application.countDocuments({ appliedAt: { $gte: monthAgo } }),
    ContestParticipant.countDocuments({ createdAt: { $gte: monthAgo } }),
    Opportunity.find({ status: "pending_review" }, { title: 1, companyName: 1, postedAt: 1, updatedAt: 1 }).sort({ updatedAt: 1 }).limit(5).lean(),
    Company.find({ ownerId: { $ne: null }, isVerified: false, reviewedAt: null }, { name: 1, ownerId: 1, createdAt: 1 }).sort({ createdAt: 1 }).limit(5).lean(),
    ContentReport.find({ status: "open" }).sort({ createdAt: 1 }).limit(5).lean(),
    ActivityLog.find({ action: /^admin\./ }).sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  // Sign-ups per week (8 weeks, calendar weeks in the app time zone).
  const weeks = Array.from({ length: 8 }, (_, i) => shiftDay(firstWeek, -i * 7));
  const signups = weeks.map((week) => ({ week, students: 0, recruiters: 0 }));
  for (const u of recentSignups) {
    if (!u.createdAt) continue;
    const bucket = signups.find((s) => s.week === weekStartKey(dayKey(new Date(u.createdAt))));
    if (bucket && u.role === "recruiter") bucket.recruiters += 1;
    else if (bucket && u.role === "student") bucket.students += 1;
  }

  const ownerIds = [...queueCompanies.map((c) => c.ownerId), ...auditTrail.map((a) => a.userId)].filter(Boolean);
  const people = await users().find({ _id: { $in: ownerIds } }, { projection: { name: 1, email: 1 } }).toArray();
  const nameOf = new Map(people.map((p) => [String(p._id), p.name || p.email]));
  const reportItems = await describeReports(queueReports);

  return plain({
    counts: { students, recruiters, newStudents, awaitingCompanies, problemsLive, problemDrafts, openRoles, pendingListings, openReports },
    activity: { submissions: submissions30, assessments: attempts30, applications: applications30, contestEntries: contestEntries30 },
    signups,
    queue: [
      ...queueListings.map((o) => ({ kind: "listing", id: String(o._id), title: o.title, sub: o.companyName, at: o.updatedAt ?? o.postedAt })),
      ...queueCompanies.map((c) => ({ kind: "company", id: String(c._id), title: c.name, sub: `Owner: ${nameOf.get(String(c.ownerId)) ?? "unknown"}`, at: c.createdAt })),
      ...reportItems.map((r) => ({ kind: "report", id: r.id, title: r.entity.title, sub: `${r.reasonLabel} · ${r.entity.typeLabel}`, at: r.createdAt, link: r.entity.link })),
    ],
    audit: auditTrail.map((a) => ({ id: String(a._id), who: nameOf.get(String(a.userId)) ?? "An admin", what: AUDIT_LABEL[a.action] ?? a.action, at: a.createdAt, title: a.metadata?.title ?? null })),
  });
}

// ── Users ─────────────────────────────────────────────────────────
export function parseUserFilters(params = {}) {
  const role = ["student", "recruiter", "admin"].includes(params.role) ? params.role : "";
  const status = ["active", "suspended"].includes(params.status) ? params.status : "";
  return { q: String(params.q ?? "").trim().slice(0, 80), role, status, page: Math.max(0, Number.parseInt(params.page, 10) || 0) };
}

export async function listUsers({ q, role, status, page }) {
  await connectToDatabase();
  const filter = {};
  if (role) filter.role = role;
  if (status === "suspended") filter.banned = true;
  if (status === "active") filter.banned = { $ne: true };
  if (q) filter.$or = [{ name: { $regex: escapeRegex(q), $options: "i" } }, { email: { $regex: escapeRegex(q), $options: "i" } }];
  const [rows, total] = await Promise.all([
    users().find(filter, { projection: { name: 1, email: 1, role: 1, banned: 1, banReason: 1, createdAt: 1, image: 1 } }).sort({ createdAt: -1 }).skip(page * PAGE).limit(PAGE).toArray(),
    users().countDocuments(filter),
  ]);
  const profiles = await Profile.find({ userId: { $in: rows.map((r) => r._id) } }, { userId: 1, fullName: 1, college: 1, level: 1, xp: 1, companyId: 1, avatarFileId: 1, onboardingComplete: 1 }).lean();
  const byUser = new Map(profiles.map((p) => [String(p.userId), p]));
  const companies = await Company.find({ _id: { $in: profiles.map((p) => p.companyId).filter(Boolean) } }, { name: 1, isVerified: 1 }).lean();
  const companyName = new Map(companies.map((c) => [String(c._id), c]));
  return plain({
    total,
    hasMore: (page + 1) * PAGE < total,
    items: rows.map((u) => {
      const p = byUser.get(String(u._id));
      const company = p?.companyId ? companyName.get(String(p.companyId)) : null;
      return {
        id: String(u._id),
        name: p?.fullName || u.name || u.email,
        email: u.email,
        role: u.role ?? "student",
        suspended: Boolean(u.banned),
        banReason: u.banReason ?? null,
        joinedAt: u.createdAt ?? null,
        image: u.image ?? null,
        hasAvatar: Boolean(p?.avatarFileId),
        college: p?.college ?? null,
        level: p?.level ?? 1,
        xp: p?.xp ?? 0,
        onboarded: Boolean(p?.onboardingComplete),
        company: company ? { name: company.name, isVerified: company.isVerified } : null,
      };
    }),
  });
}

async function targetUser(admin, userId) {
  const _id = validId(userId, "Account");
  if (String(_id) === String(admin.id)) throw new AdminError("You can't change your own account here.", 409);
  await connectToDatabase();
  const user = await users().findOne({ _id });
  if (!user) throw new AdminError("Account not found.", 404);
  if (user.role === "admin") throw new AdminError("Admin accounts are managed with `npm run make-admin`, not from the console.", 409);
  return user;
}

/**
 * Switch an account between student and recruiter. A recruiter needs a company:
 * the one they already own is kept, otherwise `companyName` creates an
 * unverified company for them.
 */
export async function setUserRole(admin, userId, { role, companyName }) {
  const user = await targetUser(admin, userId);
  if ((user.role ?? "student") === role) throw new AdminError(`This account is already a ${role}.`, 409);
  const profile = await Profile.findOne({ userId: user._id }).lean();

  let companyId = null;
  if (role === "recruiter") {
    const owned = profile?.companyId ? await Company.findOne({ _id: profile.companyId, ownerId: user._id }, { _id: 1 }).lean() : null;
    if (owned) companyId = owned._id;
    else if (companyName) {
      const company = await Company.create({ name: companyName, slug: await uniqueCompanySlug(companyName), ownerId: user._id, isVerified: false });
      companyId = company._id;
    } else {
      throw new AdminError("Name the company this recruiter will manage.", 422);
    }
  }

  await Profile.updateOne(
    { userId: user._id },
    {
      $set: { onboardingComplete: true, ...(companyId ? { companyId } : {}) },
      $setOnInsert: { userId: user._id, fullName: user.name || user.email.split("@")[0] },
    },
    { upsert: true },
  );
  await users().updateOne({ _id: user._id }, { $set: { role } });
  await audit(admin, "user_role", "user", user._id, { title: user.email, from: user.role ?? "student", to: role });
  await notify(user._id, {
    type: "system",
    title: role === "recruiter" ? "Your account is now a recruiter account" : "Your account is now a student account",
    body: role === "recruiter" ? "You can post listings and review applicants from the recruiter portal." : "Your student dashboard, coding practice and applications are available again.",
    link: role === "recruiter" ? "/recruiter" : "/dashboard",
  });
  return { role };
}

/**
 * Suspend or restore an account. Suspending signs the user out everywhere
 * (sessions deleted, new sign-ins refused by the auth hook), hides their
 * profile, and closes listings they posted so no one applies meanwhile.
 */
export async function setUserSuspended(admin, userId, { suspended, reason }) {
  const user = await targetUser(admin, userId);
  if (Boolean(user.banned) === suspended) throw new AdminError(suspended ? "This account is already suspended." : "This account isn't suspended.", 409);

  await users().updateOne({ _id: user._id }, suspended ? { $set: { banned: true, banReason: reason } } : { $set: { banned: false }, $unset: { banReason: "" } });
  await Profile.updateOne({ userId: user._id }, { $set: { isActive: !suspended } });
  let closed = 0;
  if (suspended) {
    await mongoose.connection.collection("session").deleteMany({ userId: { $in: [user._id, String(user._id)] } });
    if (user.role === "recruiter") {
      const res = await Opportunity.updateMany({ postedBy: user._id, status: { $in: ["published", "pending_review"] } }, { $set: { status: "closed" } });
      closed = res.modifiedCount;
    }
  } else {
    await notify(user._id, { type: "system", title: "Your account has been restored", body: "Welcome back. Everything is available again.", link: "/profile" });
  }
  await audit(admin, suspended ? "user_suspend" : "user_restore", "user", user._id, { title: user.email, reason, closedListings: closed });
  return { suspended, closedListings: closed };
}

// ── Companies ─────────────────────────────────────────────────────
export async function listCompanies({ filter = "awaiting", q = "" } = {}) {
  await connectToDatabase();
  const query = {};
  if (filter === "awaiting") Object.assign(query, { ownerId: { $ne: null }, isVerified: false, reviewedAt: null });
  if (filter === "verified") query.isVerified = true;
  if (filter === "unverified") query.isVerified = false;
  if (q) query.name = { $regex: escapeRegex(q.slice(0, 80)), $options: "i" };
  const companies = await Company.find(query).sort({ createdAt: -1 }).limit(100).lean();
  const ids = companies.map((c) => c._id);
  const [owners, counts] = await Promise.all([
    users().find({ _id: { $in: companies.map((c) => c.ownerId).filter(Boolean) } }, { projection: { name: 1, email: 1, banned: 1 } }).toArray(),
    Opportunity.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: { c: "$companyId", s: "$status" }, n: { $sum: 1 } } }]),
  ]);
  const ownerOf = new Map(owners.map((o) => [String(o._id), o]));
  const listingCounts = new Map();
  for (const { _id, n } of counts) {
    const entry = listingCounts.get(String(_id.c)) ?? { total: 0, live: 0, pending: 0 };
    entry.total += n;
    if (_id.s === "published") entry.live += n;
    if (_id.s === "pending_review") entry.pending += n;
    listingCounts.set(String(_id.c), entry);
  }
  return plain(
    companies.map((c) => {
      const owner = c.ownerId ? ownerOf.get(String(c.ownerId)) : null;
      return {
        id: String(c._id),
        name: c.name,
        website: c.website ?? null,
        industry: c.industry ?? null,
        location: c.location ?? null,
        size: c.size,
        description: c.description ?? "",
        hasLogo: Boolean(c.logoFileId),
        isVerified: c.isVerified,
        isSample: Boolean(c.isSample),
        reviewedAt: c.reviewedAt ?? null,
        verificationNote: c.verificationNote ?? null,
        createdAt: c.createdAt,
        owner: owner ? { id: String(owner._id), name: owner.name || owner.email, email: owner.email, suspended: Boolean(owner.banned) } : null,
        listings: listingCounts.get(String(c._id)) ?? { total: 0, live: 0, pending: 0 },
      };
    }),
  );
}

export async function decideCompany(admin, companyId, { action, note }) {
  const _id = validId(companyId, "Company");
  await connectToDatabase();
  const company = await Company.findById(_id).lean();
  if (!company) throw new AdminError("Company not found.", 404);
  if (action === "verify" && company.isVerified) throw new AdminError("This company is already verified.", 409);
  if (action === "unverify" && !company.isVerified) throw new AdminError("This company isn't verified.", 409);

  await Company.updateOne({ _id }, { $set: { isVerified: action === "verify", reviewedAt: new Date(), verificationNote: note ?? null } });
  await audit(admin, `company_${action}`, "company", _id, { title: company.name, note });
  if (company.ownerId) {
    const messages = {
      verify: [`${company.name} is verified`, "New listings now go live as soon as you publish them."],
      reject: [`${company.name} wasn't verified`, note ? `Admin note: ${note}` : "Your listings will keep going through review before they go live."],
      unverify: [`${company.name} is no longer verified`, note ? `Admin note: ${note}` : "New listings will be reviewed by an admin before they go live."],
    };
    const [title, body] = messages[action];
    await notify(company.ownerId, { type: "system", title, body, link: "/recruiter/company" });
  }
  return { isVerified: action === "verify" };
}

// ── Listing moderation ────────────────────────────────────────────
export async function listListingsForModeration({ status = "pending_review", q = "" } = {}) {
  await connectToDatabase();
  const query = {};
  if (["pending_review", "published", "rejected", "closed", "draft"].includes(status)) query.status = status;
  if (q) query.$or = [{ title: { $regex: escapeRegex(q.slice(0, 80)), $options: "i" } }, { companyName: { $regex: escapeRegex(q.slice(0, 80)), $options: "i" } }];
  const listings = await Opportunity.find(query).sort({ updatedAt: -1 }).limit(100).lean();
  const [companies, appCounts, reportCounts] = await Promise.all([
    Company.find({ _id: { $in: listings.map((l) => l.companyId).filter(Boolean) } }, { isVerified: 1 }).lean(),
    Application.aggregate([{ $match: { opportunityId: { $in: listings.map((l) => l._id) } } }, { $group: { _id: "$opportunityId", n: { $sum: 1 } } }]),
    ContentReport.aggregate([{ $match: { entityType: "opportunity", status: "open", entityId: { $in: listings.map((l) => l._id) } } }, { $group: { _id: "$entityId", n: { $sum: 1 } } }]),
  ]);
  const verified = new Map(companies.map((c) => [String(c._id), c.isVerified]));
  const apps = new Map(appCounts.map((a) => [String(a._id), a.n]));
  const reports = new Map(reportCounts.map((a) => [String(a._id), a.n]));
  return plain(
    listings.map((l) => ({
      id: String(l._id),
      title: l.title,
      companyName: l.companyName,
      companyVerified: l.companyId ? Boolean(verified.get(String(l.companyId))) : null,
      type: l.type,
      workMode: l.workMode,
      location: l.location,
      status: l.status,
      source: l.source,
      description: l.description,
      requiredSkills: l.requiredSkills ?? [],
      salary: l.salary ?? null,
      deadline: l.applicationDeadline,
      updatedAt: l.updatedAt,
      moderationNote: l.moderationNote ?? null,
      applicants: apps.get(String(l._id)) ?? 0,
      openReports: reports.get(String(l._id)) ?? 0,
      isSample: Boolean(l.isSample),
    })),
  );
}

const LISTING_RULES = {
  approve: { from: ["pending_review", "rejected"], to: "published" },
  reject: { from: ["pending_review"], to: "rejected" },
  take_down: { from: ["published", "closed"], to: "rejected" },
};

export async function decideListing(admin, listingId, { action, note }) {
  const _id = validId(listingId, "Listing");
  await connectToDatabase();
  const rule = LISTING_RULES[action];
  const updated = await Opportunity.findOneAndUpdate(
    { _id, status: { $in: rule.from } },
    { $set: { status: rule.to, moderationNote: action === "approve" ? null : note, ...(action === "approve" ? { postedAt: new Date() } : {}) } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) {
    const exists = await Opportunity.exists({ _id });
    throw new AdminError(exists ? "That listing's status changed. Refresh and try again." : "Listing not found.", exists ? 409 : 404);
  }
  await audit(admin, `listing_${action}`, "opportunity", _id, { title: updated.title, note });
  if (updated.postedBy) {
    await notify(updated.postedBy, {
      type: "system",
      title: action === "approve" ? `Listing approved: ${updated.title}` : action === "reject" ? `Changes needed: ${updated.title}` : `Listing taken down: ${updated.title}`,
      body: action === "approve" ? "It's live on SkillBridge now." : `Admin note: ${note}`,
      link: action === "approve" ? `/skillbridge/${updated._id}` : `/recruiter/listings/${updated._id}/edit`,
    });
  }
  if (action === "approve") await notifyMatchingStudents(updated);
  return { status: updated.status };
}

// ── Reports ───────────────────────────────────────────────────────
export const REASON_LABEL = { spam: "Spam", misleading: "Misleading", inappropriate: "Inappropriate", incorrect: "Incorrect content", other: "Other" };
const TYPE_LABEL = { opportunity: "Listing", profile: "Profile", problem: "Problem", question: "Assessment question", company: "Company" };

/** Title, link and current state of each reported item (in bulk). */
async function describeReports(reports) {
  const idsOf = (type) => reports.filter((r) => r.entityType === type).map((r) => r.entityId);
  const [opps, profiles, problems, questions, reporters] = await Promise.all([
    Opportunity.find({ _id: { $in: idsOf("opportunity") } }, { title: 1, companyName: 1, status: 1 }).lean(),
    Profile.find({ userId: { $in: idsOf("profile") } }, { userId: 1, fullName: 1, isPublic: 1 }).lean(),
    Problem.find({ _id: { $in: idsOf("problem") } }, { title: 1, slug: 1, isPublished: 1 }).lean(),
    Question.find({ _id: { $in: idsOf("question") } }, { prompt: 1, category: 1, isActive: 1 }).lean(),
    users().find({ _id: { $in: reports.map((r) => r.reporterId) } }, { projection: { name: 1, email: 1 } }).toArray(),
  ]);
  const find = (list, id, key = "_id") => list.find((x) => String(x[key]) === String(id));
  const reporterName = new Map(reporters.map((u) => [String(u._id), u.name || u.email]));
  return reports.map((r) => {
    let entity = { title: "Removed item", link: null, live: false };
    if (r.entityType === "opportunity") {
      const o = find(opps, r.entityId);
      if (o) entity = { title: `${o.title} · ${o.companyName}`, link: `/skillbridge/${o._id}`, live: o.status === "published", state: o.status };
    } else if (r.entityType === "profile") {
      const p = find(profiles, r.entityId, "userId");
      if (p) entity = { title: p.fullName, link: `/u/${p.userId}`, live: p.isPublic, state: p.isPublic ? "public" : "private" };
    } else if (r.entityType === "problem") {
      const p = find(problems, r.entityId);
      if (p) entity = { title: p.title, link: `/admin/problems/${p._id}`, live: p.isPublished, state: p.isPublished ? "published" : "draft" };
    } else if (r.entityType === "question") {
      const q = find(questions, r.entityId);
      if (q) entity = { title: q.prompt.length > 90 ? `${q.prompt.slice(0, 90)}…` : q.prompt, link: `/admin/questions?edit=${q._id}`, live: q.isActive, state: q.isActive ? "active" : "inactive" };
    }
    return {
      id: String(r._id),
      entityType: r.entityType,
      entityId: String(r.entityId),
      reason: r.reason,
      reasonLabel: REASON_LABEL[r.reason] ?? r.reason,
      details: r.details ?? "",
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt ?? null,
      reporter: reporterName.get(String(r.reporterId)) ?? "A user",
      entity: { ...entity, typeLabel: TYPE_LABEL[r.entityType] },
    };
  });
}

export async function listReports({ status = "open" } = {}) {
  await connectToDatabase();
  const query = ["open", "dismissed", "actioned"].includes(status) ? { status } : {};
  const reports = await ContentReport.find(query).sort({ createdAt: status === "open" ? 1 : -1 }).limit(100).lean();
  return plain(await describeReports(reports));
}

/** Who can report what: signed-in users, existing items, not their own. One report per item per user. */
export async function createReport(user, { entityType, entityId, reason, details }) {
  await connectToDatabase();
  const _id = validId(entityId);
  const exists = {
    opportunity: () => Opportunity.exists({ _id, status: "published" }),
    profile: () => Profile.exists({ userId: _id, isPublic: true }),
    problem: () => Problem.exists({ _id }),
    question: () => Question.exists({ _id }),
  }[entityType];
  if (!(await exists())) throw new AdminError("That item isn't available to report.", 404);
  if (entityType === "profile" && String(_id) === String(user.id)) throw new AdminError("You can't report your own profile.", 409);
  if (entityType === "question") {
    // Only questions the reporter has actually seen in a submitted attempt.
    const seen = await AssessmentAttempt.exists({ userId: oid(user.id), questionIds: _id, status: { $in: ["submitted", "expired"] } });
    if (!seen) throw new AdminError("That item isn't available to report.", 404);
  }
  try {
    await ContentReport.create({ reporterId: oid(user.id), entityType, entityId: _id, reason, details });
  } catch (error) {
    if (error?.code === 11000) throw new AdminError("You've already reported this. An admin will look at it.", 409);
    throw error;
  }
  await logActivity(user.id, "report.created", { entityType, entityId: _id, metadata: { reason } });
  return { ok: true };
}

/**
 * Resolve a report. "action" takes the item down in the way that fits it
 * (listing sent back, profile made private, problem unpublished, question
 * deactivated) and closes every open report on the same item.
 */
export async function decideReport(admin, reportId, { action, note }) {
  const _id = validId(reportId, "Report");
  await connectToDatabase();
  const report = await ContentReport.findOne({ _id, status: "open" }).lean();
  if (!report) throw new AdminError("This report was already handled.", 409);
  const [described] = await describeReports([report]);

  if (action === "action") {
    const id = report.entityId;
    const reasonNote = note || `Removed after a report (${REASON_LABEL[report.reason].toLowerCase()}).`;
    if (report.entityType === "opportunity") {
      const opp = await Opportunity.findOneAndUpdate({ _id: id }, { $set: { status: "rejected", moderationNote: reasonNote } }, { returnDocument: "after" }).lean();
      if (opp?.postedBy) await notify(opp.postedBy, { type: "system", title: `Listing taken down: ${opp.title}`, body: `Admin note: ${reasonNote}`, link: `/recruiter/listings/${opp._id}/edit` });
    } else if (report.entityType === "profile") {
      await Profile.updateOne({ userId: id }, { $set: { isPublic: false } });
      await notify(id, { type: "system", title: "Your profile was made private", body: `An admin reviewed a report about your profile. ${reasonNote} Update it, then make it public again in Settings.`, link: "/settings" });
    } else if (report.entityType === "problem") {
      await Problem.updateOne({ _id: id }, { $set: { isPublished: false } });
    } else if (report.entityType === "question") {
      await Question.updateOne({ _id: id }, { $set: { isActive: false } });
    }
  }

  const status = action === "action" ? "actioned" : "dismissed";
  const scope = action === "action" ? { entityType: report.entityType, entityId: report.entityId, status: "open" } : { _id };
  const affected = await ContentReport.find(scope, { reporterId: 1 }).lean();
  await ContentReport.updateMany(scope, { $set: { status, resolvedBy: oid(admin.id), resolvedAt: new Date() } });
  for (const r of affected) {
    await notify(r.reporterId, {
      type: "system",
      title: "Thanks for your report",
      body: action === "action" ? `We reviewed "${described.entity.title}" and took it down.` : `We reviewed "${described.entity.title}" and didn't find a problem.`,
    });
  }
  await audit(admin, `report_${action}`, report.entityType, report.entityId, { title: described.entity.title, note });
  return { status, resolved: affected.length };
}
