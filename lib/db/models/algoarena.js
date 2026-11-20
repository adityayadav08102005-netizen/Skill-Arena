import { DIFFICULTIES, LANGUAGES, ObjectId, Schema, USER_REF, baseOptions, model } from "./_shared.js";

/* skills — shared catalogue used by profiles, opportunities and filters. */
const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: String, enum: ["language", "technical", "tool", "soft"], required: true },
  },
  baseOptions,
);
skillSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
export const Skill = model("Skill", skillSchema, "skills");

/* problems — hidden tests use select:false so they are never sent to clients by accident. */
const testCaseSchema = new Schema(
  {
    input: { type: String, default: "" },
    output: { type: String, default: "" },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const problemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    topics: [{ type: String, trim: true }],
    concepts: [{ type: String, trim: true }],
    isInterview: { type: Boolean, default: false },
    inputFormat: String,
    outputFormat: String,
    constraints: String,
    samples: { type: [testCaseSchema], default: [] },
    hiddenTests: { type: [testCaseSchema], default: [], select: false },
    hints: [String],
    timeComplexity: String,
    spaceComplexity: String,
    xpReward: { type: Number, min: 0, default: 10 },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: USER_REF, default: null },
  },
  baseOptions,
);
problemSchema.index({ difficulty: 1, isPublished: 1 });
problemSchema.index({ topics: 1 });
problemSchema.index({ title: "text", description: "text" });
export const Problem = model("Problem", problemSchema, "problems");

/* problem_submissions — written only by the server after judging. */
const submissionSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true },
    problemId: { type: ObjectId, ref: "Problem", required: true },
    contestId: { type: ObjectId, ref: "Contest", default: null },
    language: { type: String, enum: LANGUAGES, required: true },
    code: { type: String, maxlength: 64_000, default: null },
    status: {
      type: String,
      // not_executed: saved in demo mode (no code runner configured); never judged, never rewarded.
      enum: ["accepted", "wrong_answer", "time_limit_exceeded", "runtime_error", "compilation_error", "internal_error", "pending", "not_executed"],
      required: true,
    },
    passedCount: { type: Number, min: 0, default: 0 },
    totalCount: { type: Number, min: 0, default: 0 },
    // Which test failed first; hidden tests never store their input or expected output.
    failedTest: {
      index: { type: Number, default: null },
      hidden: { type: Boolean, default: null },
    },
    compileOutput: { type: String, maxlength: 4000, default: null },
    isDailyChallenge: { type: Boolean, default: false },
    runtimeMs: { type: Number, default: null },
    memoryKb: { type: Number, default: null },
    executionMode: { type: String, enum: ["judge0", "paiza", "demo"], required: true },
    xpAwarded: { type: Number, min: 0, default: 0 },
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, problemId: 1, status: 1 });
submissionSchema.index({ problemId: 1, createdAt: -1 });
export const ProblemSubmission = model("ProblemSubmission", submissionSchema, "problem_submissions");

/* daily challenges and completions (supports the coding-streak and XP rules). */
const dailyChallengeSchema = new Schema(
  {
    date: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // UTC day
    problemId: { type: ObjectId, ref: "Problem", required: true },
    bonusXp: { type: Number, min: 0, default: 15 },
  },
  baseOptions,
);
export const DailyChallenge = model("DailyChallenge", dailyChallengeSchema, "daily_challenges");

const dailyCompletionSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    problemId: { type: ObjectId, ref: "Problem", required: true },
    submissionId: { type: ObjectId, ref: "ProblemSubmission", required: true },
    xpAwarded: { type: Number, min: 0, default: 0 },
  },
  baseOptions,
);
dailyCompletionSchema.index({ userId: 1, date: 1 }, { unique: true });
export const DailyChallengeCompletion = model("DailyChallengeCompletion", dailyCompletionSchema, "daily_challenge_completions");
