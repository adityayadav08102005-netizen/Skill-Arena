import "server-only";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Application, Company, Opportunity, Profile } from "@/lib/db/models";
import { evaluateAchievements } from "./achievements";
import { logActivity, notify } from "./activity";
import { UploadError, copyUpload, deleteUpload, storeUpload } from "./files";
import { isEligibleYear } from "./recommendations";

export class ApplicationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));

/** Statuses a student may still withdraw from (decisions are final). */
export const WITHDRAWABLE = ["applied", "under_review", "shortlisted", "interview_scheduled"];

/**
 * Apply to a listing on the platform.
 * Checks: student account, listing open and on-platform, deadline, graduation-year
 * eligibility, one application per listing. The resume is a snapshot: either a
 * copy of the profile resume or a new upload just for this application.
 */
export async function applyToOpportunity(user, opportunityId, { coverLetter, resumeChoice, file }) {
  if (!ObjectId.isValid(opportunityId)) throw new ApplicationError("Opportunity not found.", 404);
  await connectToDatabase();
  const [opp, profile] = await Promise.all([Opportunity.findById(opportunityId).lean(), Profile.findOne({ userId: oid(user.id) }).lean()]);
  if (!opp) throw new ApplicationError("Opportunity not found.", 404);
  if (opp.status !== "published") throw new ApplicationError("This opportunity isn't accepting applications.", 409);
  if (opp.applicationDeadline && new Date(opp.applicationDeadline) < new Date()) throw new ApplicationError("The application deadline has passed.", 409);
  if (opp.applyMethod !== "platform") throw new ApplicationError("Apply for this one on the company's site.", 409);
  if (!profile?.onboardingComplete) throw new ApplicationError("Finish setting up your account first.", 409);
  if ((opp.graduationYears ?? []).length && !profile.graduationYear) {
    throw new ApplicationError("Add your graduation year to your profile to apply. This role has batch requirements.", 422);
  }
  if (!isEligibleYear(opp, profile.graduationYear)) {
    throw new ApplicationError(`This role is open to the ${opp.graduationYears.join(", ")} batch${opp.graduationYears.length > 1 ? "es" : ""} only.`, 422);
  }
  const existing = await Application.findOne({ opportunityId: opp._id, studentId: oid(user.id) }, { status: 1 }).lean();
  if (existing) {
    throw new ApplicationError(existing.status === "withdrawn" ? "You withdrew your application for this role." : "You've already applied to this role.", 409);
  }

  let resumeFileId = null;
  if (resumeChoice === "upload") {
    try {
      resumeFileId = await storeUpload("resume", file, user.id);
    } catch (error) {
      if (error instanceof UploadError) throw new ApplicationError(error.message, error.status);
      throw error;
    }
  } else {
    if (!profile.resumeFileId) throw new ApplicationError("Upload a resume to your profile first, or attach one to this application.", 422);
    resumeFileId = await copyUpload("resume", profile.resumeFileId, user.id, { kind: "resume", application: true });
    if (!resumeFileId) throw new ApplicationError("Your profile resume couldn't be found. Upload it again.", 422);
  }

  let application;
  try {
    application = await Application.create({
      opportunityId: opp._id,
      studentId: oid(user.id),
      resumeFileId,
      coverLetter: coverLetter || undefined,
      status: "applied",
      history: [{ status: "applied", changedBy: oid(user.id), at: new Date() }],
      appliedAt: new Date(),
    });
  } catch (error) {
    await deleteUpload("resume", resumeFileId).catch(() => {}); // don't leave an orphaned resume copy
    if (error?.code === 11000) throw new ApplicationError("You've already applied to this role.", 409);
    throw error;
  }

  await logActivity(user.id, "application.submitted", { entityType: "opportunity", entityId: opp._id });
  await notify(user.id, {
    type: "application_status",
    title: `Application sent: ${opp.title}`,
    body: `${opp.companyName} will review it. Track it in My applications.`,
    link: "/applications",
  });
  const recruiterIds = await recruitersFor(opp);
  for (const rid of recruiterIds) {
    await notify(rid, {
      type: "new_application",
      title: `New application for ${opp.title}`,
      body: `${profile.fullName} applied.`,
      link: `/recruiter/listings/${opp._id}?candidate=${application._id}`,
    });
  }
  const badges = await evaluateAchievements(user.id);
  return plain({ id: String(application._id), status: application.status, badges });
}

/** Recruiters who should hear about a listing: whoever posted it and the company owner. */
async function recruitersFor(opp) {
  const ids = new Set();
  if (opp.postedBy) ids.add(String(opp.postedBy));
  if (opp.companyId) {
    const company = await Company.findById(opp.companyId, { ownerId: 1 }).lean();
    if (company?.ownerId) ids.add(String(company.ownerId));
  }
  return [...ids];
}

export async function withdrawApplication(user, applicationId) {
  if (!ObjectId.isValid(applicationId)) throw new ApplicationError("Application not found.", 404);
  await connectToDatabase();
  const updated = await Application.findOneAndUpdate(
    { _id: oid(applicationId), studentId: oid(user.id), status: { $in: WITHDRAWABLE } },
    { $set: { status: "withdrawn" }, $push: { history: { status: "withdrawn", changedBy: oid(user.id), at: new Date() } } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) {
    const exists = await Application.findOne({ _id: oid(applicationId), studentId: oid(user.id) }, { status: 1 }).lean();
    if (!exists) throw new ApplicationError("Application not found.", 404);
    throw new ApplicationError("This application can no longer be withdrawn.", 409);
  }
  const opp = await Opportunity.findById(updated.opportunityId, { title: 1, postedBy: 1, companyId: 1 }).lean();
  await logActivity(user.id, "application.withdrawn", { entityType: "application", entityId: applicationId });
  if (opp) {
    for (const rid of await recruitersFor(opp)) {
      await notify(rid, { type: "new_application", title: `Application withdrawn: ${opp.title}`, body: "A candidate withdrew their application.", link: `/recruiter/listings/${opp._id}?candidate=${applicationId}` });
    }
  }
  return { status: "withdrawn" };
}

/** The student's applications, newest first, with listing details and status history. */
export async function listMyApplications(userId) {
  await connectToDatabase();
  const apps = await Application.find({ studentId: oid(userId) })
    .sort({ appliedAt: -1 })
    .populate("opportunityId", "title companyName workMode location type applicationDeadline status")
    .lean();
  return plain(
    apps.map((a) => ({
      id: String(a._id),
      status: a.status,
      appliedAt: a.appliedAt,
      interviewAt: a.interviewAt ?? null,
      statusNote: a.statusNote ?? "",
      coverLetter: a.coverLetter ?? "",
      hasResume: Boolean(a.resumeFileId),
      history: a.history ?? [],
      withdrawable: WITHDRAWABLE.includes(a.status),
      isSample: Boolean(a.isSample),
      messages: (a.messages ?? []).map((m) => ({ body: m.body, at: m.at })),
      opportunity: a.opportunityId
        ? {
            id: String(a.opportunityId._id),
            title: a.opportunityId.title,
            companyName: a.opportunityId.companyName,
            workMode: a.opportunityId.workMode,
            location: a.opportunityId.location,
            type: a.opportunityId.type,
          }
        : null,
    })),
  );
}

/**
 * Who may download an application's resume: the student, an admin, or the
 * recruiter who posted the listing / owns its company.
 */
export async function resumeAccess(user, applicationId) {
  if (!ObjectId.isValid(applicationId)) return null;
  await connectToDatabase();
  const app = await Application.findById(applicationId, { studentId: 1, opportunityId: 1, resumeFileId: 1 }).lean();
  if (!app?.resumeFileId) return null;
  if (String(app.studentId) === String(user.id) || user.role === "admin") return app;
  if (user.role === "recruiter") {
    const opp = await Opportunity.findById(app.opportunityId, { postedBy: 1, companyId: 1 }).lean();
    if (opp && (await recruitersFor(opp)).includes(String(user.id))) return app;
  }
  return false;
}
