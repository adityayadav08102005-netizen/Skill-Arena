import { ObjectId, Schema, USER_REF, baseOptions, model } from "./_shared.js";

/* recruiter_companies */
const companySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 3000 },
    website: { type: String, trim: true, maxlength: 300 },
    logoFileId: { type: ObjectId, default: null },
    industry: { type: String, trim: true, maxlength: 80 },
    size: { type: String, enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"], default: "11-50" },
    location: { type: String, trim: true, maxlength: 120 },
    ownerId: { type: ObjectId, ref: USER_REF, default: null }, // null = admin-managed
    isVerified: { type: Boolean, default: false },
    reviewedAt: { type: Date, default: null }, // last admin verification decision
    verificationNote: { type: String, maxlength: 1000, default: null },
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);
companySchema.index({ ownerId: 1 });
export const Company = model("Company", companySchema, "recruiter_companies");

/* opportunities — manual listings plus external ones (Remotive, Arbeitnow) in Phase 10. */
const opportunitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    companyId: { type: ObjectId, ref: "Company", default: null },
    companyName: { type: String, required: true, trim: true, maxlength: 120 },
    companyDescription: { type: String, maxlength: 3000 },
    description: { type: String, required: true, maxlength: 10000 },
    type: {
      type: String,
      enum: ["internship", "full_time", "part_time", "freelance", "student_project", "training"],
      required: true,
    },
    workMode: { type: String, enum: ["remote", "hybrid", "onsite"], required: true },
    location: { type: String, trim: true, maxlength: 120 },
    experienceLevel: { type: String, enum: ["fresher", "0-1", "1-3", "3+"], default: "fresher" },
    requiredSkills: [{ type: String, trim: true }],
    preferredSkills: [{ type: String, trim: true }],
    eligibility: { type: String, maxlength: 2000 },
    graduationYears: [{ type: Number, min: 1980, max: 2100 }], // empty = any year
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: "INR", maxlength: 3 },
      period: { type: String, enum: ["hour", "month", "year", "total"] },
    },
    applicationDeadline: { type: Date, default: null },
    applyMethod: { type: String, enum: ["platform", "external"], default: "platform" },
    applyUrl: { type: String, trim: true, maxlength: 500, default: null },
    source: { type: String, enum: ["manual", "remotive", "arbeitnow", "himalayas", "jobicy", "adzuna"], default: "manual" },
    externalId: { type: String, default: null },
    lastSeenAt: { type: Date, default: null }, // external listings: last sync that still listed it
    postedBy: { type: ObjectId, ref: USER_REF, default: null },
    postedAt: { type: Date, default: Date.now },
    notifiedAt: { type: Date, default: null }, // when matching students were told about it (once)
    moderationNote: { type: String, maxlength: 1000, default: null }, // admin feedback when rejected
    status: {
      type: String,
      enum: ["draft", "pending_review", "published", "closed", "rejected"],
      default: "pending_review",
    },
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);
opportunitySchema.index({ status: 1, postedAt: -1 });
opportunitySchema.index({ requiredSkills: 1 });
opportunitySchema.index({ type: 1, workMode: 1, experienceLevel: 1 });
opportunitySchema.index({ companyId: 1 });
opportunitySchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } },
);
opportunitySchema.index({ title: "text", companyName: "text", description: "text", requiredSkills: "text" });
export const Opportunity = model("Opportunity", opportunitySchema, "opportunities");

/* saved_opportunities */
const savedSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true },
    opportunityId: { type: ObjectId, ref: "Opportunity", required: true },
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);
savedSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
export const SavedOpportunity = model("SavedOpportunity", savedSchema, "saved_opportunities");

/* applications — one per student per opportunity; status changes go through services. */
export const APPLICATION_STATUSES = [
  "applied", "under_review", "shortlisted", "interview_scheduled", "rejected", "selected", "withdrawn",
];

const applicationSchema = new Schema(
  {
    opportunityId: { type: ObjectId, ref: "Opportunity", required: true },
    studentId: { type: ObjectId, ref: USER_REF, required: true },
    resumeFileId: { type: ObjectId, default: null },
    coverLetter: { type: String, maxlength: 4000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: "applied" },
    statusNote: { type: String, maxlength: 1000 },
    interviewAt: { type: Date, default: null },
    history: [
      {
        _id: false,
        status: { type: String, enum: APPLICATION_STATUSES },
        changedBy: { type: ObjectId, ref: USER_REF },
        note: { type: String, maxlength: 1000 },
        at: { type: Date, default: Date.now },
      },
    ],
    // Recruiter → candidate messages (allowed once shortlisted).
    messages: [
      {
        _id: false,
        from: { type: ObjectId, ref: USER_REF, required: true },
        body: { type: String, required: true, maxlength: 2000 },
        at: { type: Date, default: Date.now },
      },
    ],
    appliedAt: { type: Date, default: Date.now },
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);
applicationSchema.index({ opportunityId: 1, studentId: 1 }, { unique: true });
applicationSchema.index({ studentId: 1, appliedAt: -1 });
applicationSchema.index({ opportunityId: 1, status: 1 });
export const Application = model("Application", applicationSchema, "applications");
