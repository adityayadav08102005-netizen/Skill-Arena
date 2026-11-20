import { LANGUAGES, ObjectId, Schema, USER_REF, baseOptions, model } from "./_shared.js";

/* contests — problems stay hidden from students until startsAt (enforced in services). */
const contestSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, maxlength: 4000 },
    startsAt: { type: Date, required: true },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startsAt || value > this.startsAt;
        },
        message: "endsAt must be after startsAt",
      },
    },
    problems: [
      {
        _id: false,
        problemId: { type: ObjectId, ref: "Problem", required: true },
        points: { type: Number, min: 1, required: true },
        position: { type: Number, min: 0, required: true },
      },
    ],
    penaltyMinutesPerWrong: { type: Number, min: 0, default: 10 },
    isPublished: { type: Boolean, default: true },
    finalizedAt: { type: Date, default: null }, // set once final ranks, XP and badges are applied
    createdBy: { type: ObjectId, ref: USER_REF, default: null },
  },
  baseOptions,
);
contestSchema.index({ startsAt: 1 });
contestSchema.index({ endsAt: -1 });
export const Contest = model("Contest", contestSchema, "contests");

/* contest_participants — registration plus server-computed score and rank. */
const participantSchema = new Schema(
  {
    contestId: { type: ObjectId, ref: "Contest", required: true },
    userId: { type: ObjectId, ref: USER_REF, required: true },
    score: { type: Number, min: 0, default: 0 },
    solvedCount: { type: Number, min: 0, default: 0 },
    penaltyMinutes: { type: Number, min: 0, default: 0 },
    submissions: { type: Number, min: 0, default: 0 }, // judged contest submissions
    rank: { type: Number, default: null },
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);
participantSchema.index({ contestId: 1, userId: 1 }, { unique: true });
participantSchema.index({ contestId: 1, score: -1, penaltyMinutes: 1 });
participantSchema.index({ userId: 1 });
export const ContestParticipant = model("ContestParticipant", participantSchema, "contest_participants");

/* contest_submissions — links a judged submission to a contest problem. */
const contestSubmissionSchema = new Schema(
  {
    contestId: { type: ObjectId, ref: "Contest", required: true },
    userId: { type: ObjectId, ref: USER_REF, required: true },
    problemId: { type: ObjectId, ref: "Problem", required: true },
    submissionId: { type: ObjectId, ref: "ProblemSubmission", required: true, unique: true },
    language: { type: String, enum: LANGUAGES, required: true },
    status: { type: String, required: true }, // verdict, same values as problem_submissions.status
    accepted: { type: Boolean, required: true },
    minute: { type: Number, min: 0, required: true }, // minutes after the contest started
    pointsAwarded: { type: Number, min: 0, default: 0 },
  },
  baseOptions,
);
contestSubmissionSchema.index({ contestId: 1, userId: 1, problemId: 1, createdAt: 1 });
export const ContestSubmission = model("ContestSubmission", contestSubmissionSchema, "contest_submissions");
