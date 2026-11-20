import "server-only";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Application, Company, Opportunity, Profile } from "@/lib/db/models";
import { logActivity, notify } from "./activity";
import { candidateSummaries, candidateSummary } from "./candidates";
import { scoreOpportunity } from "./recommendations";

export class RecruiterError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));
const STATUS_LABEL = {
  applied: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview scheduled",
  selected: "Selected",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};
/** Contact (messages, email) opens up once a candidate is shortlisted. */
export const CONTACTABLE = ["shortlisted", "interview_scheduled", "selected"];

/** The signed-in recruiter's company. Every recruiter action starts here. */
export async function recruiterContext(user) {
  await connectToDatabase();
  const profile = await Profile.findOne({ userId: oid(user.id) }, { companyId: 1, fullName: 1 }).lean();
  if (!profile?.companyId) throw new RecruiterError("Set up your company first.", 409);
  const company = await Company.findOne({ _id: profile.companyId, ownerId: oid(user.id) }).lean();
  if (!company) throw new RecruiterError("You don't manage a company yet.", 403);
  return { profile, company };
}

const owns = (company, user, opp) => String(opp.companyId) === String(company._id) || String(opp.postedBy) === String(user.id);

async function ownListing(user, id) {
  if (!ObjectId.isValid(id)) throw new RecruiterError("Listing not found.", 404);
  const { company, profile } = await recruiterContext(user);
  const opp = await Opportunity.findById(id).lean();
  if (!opp || !owns(company, user, opp)) throw new RecruiterError("Listing not found.", 404); // 404, not 403: don't confirm others' ids
  return { company, profile, opp };
}

async function ownApplication(user, applicationId) {
  if (!ObjectId.isValid(applicationId)) throw new RecruiterError("Application not found.", 404);
  const { company, profile } = await recruiterContext(user);
  const app = await Application.findById(applicationId).lean();
  if (!app) throw new RecruiterError("Application not found.", 404);
  const opp = await Opportunity.findById(app.opportunityId).lean();
  if (!opp || !owns(company, user, opp)) throw new RecruiterError("Application not found.", 404);
  return { company, profile, app, opp };
}

// ── Company ───────────────────────────────────────────────────────
export async function getCompany(user) {
  const { company } = await recruiterContext(user);
  return plain({ ...company, id: String(company._id), hasLogo: Boolean(company.logoFileId) });
}

export async function updateCompany(user, data) {
  const { company } = await recruiterContext(user);
  const unset = {};
  const set = { name: data.name, size: data.size };
  for (const key of ["description", "website", "industry", "location"]) {
    if (data[key] === undefined) unset[key] = "";
    else set[key] = data[key];
  }
  const updated = await Company.findByIdAndUpdate(company._id, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { returnDocument: "after", runValidators: true }).lean();
  // Keep denormalised copies on the company's manual listings in sync.
  await Opportunity.updateMany({ companyId: company._id, source: "manual" }, { $set: { companyName: updated.name, companyDescription: updated.description ?? "" } });
  await logActivity(user.id, "company.updated", { entityType: "company", entityId: company._id });
  return plain({ ...updated, id: String(updated._id), hasLogo: Boolean(updated.logoFileId) });
}

export async function setCompanyLogo(user, fileId) {
  const { company } = await recruiterContext(user);
  await Company.updateOne({ _id: company._id }, { $set: { logoFileId: fileId ? oid(fileId) : null } });
  return { previous: company.logoFileId ?? null, companyId: String(company._id) };
}

// ── Listings ──────────────────────────────────────────────────────
function listingFields(data, company) {
  const salary = data.salaryMin !== undefined ? { min: data.salaryMin, max: data.salaryMax ?? data.salaryMin, currency: "INR", period: data.salaryPeriod } : undefined;
  return {
    title: data.title,
    description: data.description,
    type: data.type,
    workMode: data.workMode,
    location: data.location,
    experienceLevel: data.experienceLevel,
    requiredSkills: [...new Set(data.requiredSkills)],
    preferredSkills: [...new Set(data.preferredSkills)],
    eligibility: data.eligibility ?? "",
    graduationYears: [...new Set(data.graduationYears)].sort(),
    salary,
    applicationDeadline: data.applicationDeadline ?? null,
    companyId: company._id,
    companyName: company.name,
    companyDescription: company.description ?? "",
  };
}

/** Publishing goes live straight away for verified companies, otherwise it waits for an admin. */
const publishedStatus = (company) => (company.isVerified ? "published" : "pending_review");

export async function listOwnListings(user) {
  const { company } = await recruiterContext(user);
  const listings = await Opportunity.find({ $or: [{ companyId: company._id }, { postedBy: oid(user.id) }], source: "manual" }).sort({ postedAt: -1 }).lean();
  const counts = await Application.aggregate([
    { $match: { opportunityId: { $in: listings.map((l) => l._id) } } },
    { $group: { _id: { o: "$opportunityId", s: "$status" }, n: { $sum: 1 } } },
  ]);
  const byListing = {};
  for (const c of counts) (byListing[String(c._id.o)] ??= {})[c._id.s] = c.n;
  return plain({
    company: { id: String(company._id), name: company.name, isVerified: company.isVerified },
    listings: listings.map((l) => {
      const st = byListing[String(l._id)] ?? {};
      return {
        id: String(l._id),
        title: l.title,
        type: l.type,
        workMode: l.workMode,
        location: l.location,
        status: l.status,
        moderationNote: l.moderationNote,
        postedAt: l.postedAt,
        deadline: l.applicationDeadline,
        applicants: Object.entries(st).filter(([s]) => s !== "withdrawn").reduce((s, [, n]) => s + n, 0),
        byStatus: st,
      };
    }),
  });
}

export async function getOwnListing(user, id) {
  const { opp, company } = await ownListing(user, id);
  return plain({ ...opp, id: String(opp._id), companyVerified: company.isVerified });
}

export async function createListing(user, data) {
  const { company } = await recruiterContext(user);
  const status = data.status === "draft" ? "draft" : publishedStatus(company);
  const opp = await Opportunity.create({ ...listingFields(data, company), postedBy: oid(user.id), postedAt: new Date(), status, source: "manual", applyMethod: "platform" });
  await logActivity(user.id, "listing.created", { entityType: "opportunity", entityId: opp._id, metadata: { status } });
  if (status === "published") await notifyMatchingStudents(opp.toObject());
  return { id: String(opp._id), status };
}

export async function updateListing(user, id, data) {
  const { company, opp } = await ownListing(user, id);
  let status = opp.status;
  if (data.status === "draft" && ["draft", "pending_review", "rejected"].includes(opp.status)) status = "draft";
  if (data.status === "published" && opp.status !== "closed") status = publishedStatus(company);
  const updated = await Opportunity.findByIdAndUpdate(opp._id, { $set: { ...listingFields(data, company), status, moderationNote: null } }, { returnDocument: "after", runValidators: true }).lean();
  await logActivity(user.id, "listing.updated", { entityType: "opportunity", entityId: opp._id, metadata: { status } });
  if (status === "published") await notifyMatchingStudents(updated);
  return { id: String(opp._id), status };
}

export async function setListingState(user, id, action) {
  const { company, opp } = await ownListing(user, id);
  const next = {
    publish: ["draft", "rejected", "closed"].includes(opp.status) ? publishedStatus(company) : opp.status,
    reopen: opp.status === "closed" ? publishedStatus(company) : opp.status,
    close: ["published", "pending_review"].includes(opp.status) ? "closed" : opp.status,
    draft: ["pending_review", "rejected"].includes(opp.status) ? "draft" : opp.status,
  }[action];
  if (next === opp.status) throw new RecruiterError(`This listing can't be ${action === "draft" ? "moved to drafts" : `${action}ed`} from "${opp.status.replace("_", " ")}".`, 409);
  if (next !== "closed" && opp.applicationDeadline && new Date(opp.applicationDeadline) < new Date()) {
    throw new RecruiterError("The deadline has passed. Edit the listing to set a new one first.", 409);
  }
  await Opportunity.updateOne({ _id: opp._id }, { $set: { status: next } });
  await logActivity(user.id, `listing.${action}`, { entityType: "opportunity", entityId: opp._id });
  if (next === "published") await notifyMatchingStudents({ ...opp, status: next });
  return { status: next };
}

export async function deleteListing(user, id) {
  const { opp } = await ownListing(user, id);
  if (await Application.exists({ opportunityId: opp._id })) {
    throw new RecruiterError("This listing has applications, so it can't be deleted. Close it instead.", 409);
  }
  await Opportunity.deleteOne({ _id: opp._id });
  await logActivity(user.id, "listing.deleted", { entityType: "opportunity", entityId: opp._id, metadata: { title: opp.title } });
  return { deleted: true };
}

/**
 * "New relevant opportunity" notifications, sent once per listing when it
 * first goes live: the best-matching eligible students (score ≥ 60, max 50).
 */
export async function notifyMatchingStudents(opp) {
  if (opp.status !== "published" || opp.notifiedAt) return 0;
  const claimed = await Opportunity.findOneAndUpdate({ _id: opp._id, notifiedAt: null }, { $set: { notifiedAt: new Date() } });
  if (!claimed) return 0;
  const students = await mongoose.connection.collection("user").find({ role: "student" }, { projection: { _id: 1 } }).toArray();
  const profiles = await Profile.find(
    { userId: { $in: students.map((s) => s._id) }, onboardingComplete: true, isActive: true },
    { userId: 1, skills: 1, preferredRoles: 1, graduationYear: 1, experience: 1 },
  ).lean();
  const matches = profiles
    .map((p) => ({ p, m: scoreOpportunity(p, opp) }))
    .filter(({ m }) => m.eligible && m.overlap && m.score >= 60)
    .sort((a, b) => b.m.score - a.m.score)
    .slice(0, 50);
  for (const { p, m } of matches) {
    await notify(p.userId, {
      type: "new_opportunity",
      title: `New match: ${opp.title}`,
      body: `${opp.companyName} · ${m.score}% match`,
      link: `/skillbridge/${opp._id}`,
    });
  }
  return matches.length;
}

// ── Pipeline and candidates ───────────────────────────────────────
export async function getPipeline(user, listingId) {
  const { opp } = await ownListing(user, listingId);
  const apps = await Application.find({ opportunityId: opp._id }).sort({ appliedAt: 1 }).lean();
  const summaries = await candidateSummaries(apps.map((a) => a.studentId));
  return plain({
    listing: { id: String(opp._id), title: opp.title, status: opp.status, location: opp.location, workMode: opp.workMode, deadline: opp.applicationDeadline, requiredSkills: opp.requiredSkills },
    applications: apps.map((a) => {
      const s = summaries.get(String(a.studentId));
      const match = s ? scoreOpportunity({ skills: s.skills, preferredRoles: s.preferredRoles, graduationYear: s.graduationYear, experience: s.experience }, opp) : null;
      return {
        id: String(a._id),
        status: a.status,
        appliedAt: a.appliedAt,
        interviewAt: a.interviewAt,
        match: match?.score ?? null,
        candidate: s ? { userId: s.userId, name: s.fullName, college: s.college, graduationYear: s.graduationYear, level: s.level, solved: s.coding.solved, bestAssessment: s.assessments.best, verifiedSkills: s.skills.filter((k) => k.verified).length, hasAvatar: s.hasAvatar, image: s.image } : null,
      };
    }),
  });
}

export async function getApplicant(user, applicationId) {
  const { app, opp } = await ownApplication(user, applicationId);
  const summary = await candidateSummary(app.studentId, { forRecruiter: true });
  const contactable = CONTACTABLE.includes(app.status);
  const authUser = contactable ? await mongoose.connection.collection("user").findOne({ _id: app.studentId }, { projection: { email: 1 } }) : null;
  const match = summary ? scoreOpportunity({ skills: summary.skills, preferredRoles: summary.preferredRoles, graduationYear: summary.graduationYear, experience: summary.experience }, opp) : null;
  return plain({
    id: String(app._id),
    status: app.status,
    appliedAt: app.appliedAt,
    interviewAt: app.interviewAt,
    statusNote: app.statusNote,
    coverLetter: app.coverLetter ?? "",
    hasResume: Boolean(app.resumeFileId),
    history: app.history ?? [],
    messages: app.messages ?? [],
    contactable,
    email: authUser?.email ?? null,
    match: match ? { score: match.score, matchedSkills: match.matchedSkills, missingSkills: match.missingSkills } : null,
    listing: { id: String(opp._id), title: opp.title },
    candidate: summary,
  });
}

export async function changeApplicationStatus(user, applicationId, { status, note, interviewAt }) {
  const { app, opp, company } = await ownApplication(user, applicationId);
  if (app.status === "withdrawn") throw new RecruiterError("The candidate withdrew this application.", 409);
  if (app.status === status && status !== "interview_scheduled") throw new RecruiterError(`Already ${STATUS_LABEL[status].toLowerCase()}.`, 409);
  const set = { status, statusNote: note ?? null };
  if (status === "interview_scheduled") set.interviewAt = interviewAt;
  const updated = await Application.findOneAndUpdate(
    { _id: app._id, status: { $ne: "withdrawn" } },
    { $set: set, $push: { history: { status, changedBy: oid(user.id), note: note ?? undefined, at: new Date() } } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) throw new RecruiterError("The candidate withdrew this application.", 409);

  const when = interviewAt ? interviewAt.toLocaleString("en-IN", { timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;
  await notify(app.studentId, {
    type: "application_status",
    title: `${opp.title}: ${STATUS_LABEL[status]}`,
    body: [status === "interview_scheduled" && when ? `Interview on ${when} with ${company.name}.` : `Update from ${company.name}.`, note].filter(Boolean).join(" "),
    link: "/applications",
  });
  await logActivity(user.id, "application.status_changed", { entityType: "application", entityId: app._id, metadata: { from: app.status, to: status } });
  return { status: updated.status, interviewAt: updated.interviewAt };
}

export async function messageCandidate(user, applicationId, body) {
  const { app, opp, company } = await ownApplication(user, applicationId);
  if (!CONTACTABLE.includes(app.status)) throw new RecruiterError("Shortlist the candidate before contacting them.", 409);
  await Application.updateOne({ _id: app._id }, { $push: { messages: { from: oid(user.id), body, at: new Date() } } });
  await notify(app.studentId, { type: "application_status", title: `Message from ${company.name}`, body: body.length > 140 ? `${body.slice(0, 137)}…` : body, link: "/applications" });
  await logActivity(user.id, "application.messaged", { entityType: "application", entityId: app._id, metadata: { listing: opp.title } });
  return { sent: true };
}

/** Recruiter home: listing and pipeline totals, recent applicants, upcoming interviews. */
export async function recruiterOverview(user) {
  const { company } = await recruiterContext(user);
  const listings = await Opportunity.find({ $or: [{ companyId: company._id }, { postedBy: oid(user.id) }], source: "manual" }, { title: 1, status: 1 }).lean();
  const ids = listings.map((l) => l._id);
  const titleOf = new Map(listings.map((l) => [String(l._id), l.title]));
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [byStatus, recent, interviews, newThisWeek] = await Promise.all([
    Application.aggregate([{ $match: { opportunityId: { $in: ids } } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Application.find({ opportunityId: { $in: ids }, status: { $ne: "withdrawn" } }).sort({ appliedAt: -1 }).limit(6).lean(),
    Application.find({ opportunityId: { $in: ids }, status: "interview_scheduled", interviewAt: { $gte: new Date() } }).sort({ interviewAt: 1 }).limit(5).lean(),
    Application.countDocuments({ opportunityId: { $in: ids }, appliedAt: { $gte: weekAgo } }),
  ]);
  const people = await candidateSummaries([...recent, ...interviews].map((a) => a.studentId));
  const row = (a) => ({ id: String(a._id), listingId: String(a.opportunityId), listing: titleOf.get(String(a.opportunityId)), status: a.status, appliedAt: a.appliedAt, interviewAt: a.interviewAt, name: people.get(String(a.studentId))?.fullName ?? "Candidate" });
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  return plain({
    company: { name: company.name, isVerified: company.isVerified },
    listings: {
      total: listings.length,
      live: listings.filter((l) => l.status === "published").length,
      pending: listings.filter((l) => l.status === "pending_review").length,
      drafts: listings.filter((l) => l.status === "draft").length,
    },
    applicants: Object.entries(counts).filter(([s]) => s !== "withdrawn").reduce((s, [, n]) => s + n, 0),
    newThisWeek,
    byStatus: counts,
    recent: recent.map(row),
    interviews: interviews.map(row),
  });
}
