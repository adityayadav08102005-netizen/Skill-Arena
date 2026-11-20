import mongoose from "mongoose";
import { ObjectId, Schema, USER_REF, baseOptions, model } from "./_shared.js";

export const ASSESSMENT_CATEGORY_KEYS = [
  "python", "java", "javascript", "c_cpp", "dsa", "dbms", "os", "cn", "oop", "aptitude", "logical", "interview",
];

const assessmentSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    category: { type: String, enum: ASSESSMENT_CATEGORY_KEYS, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard", "mixed"], default: "mixed" },
    description: { type: String, maxlength: 2000 },
    durationMinutes: { type: Number, min: 1, max: 180, required: true },
    questionCount: { type: Number, min: 1, max: 100, required: true },
    passPercentage: { type: Number, min: 0, max: 100, default: 60 },
    xpReward: { type: Number, min: 0, default: 40 },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: USER_REF, default: null },
  },
  baseOptions,
);
assessmentSchema.index({ category: 1, isPublished: 1 });
export const Assessment = model("Assessment", assessmentSchema, "assessments");

/* questions — reusable bank. `answer` is select:false so it never leaks to students. */
const questionSchema = new Schema(
  {
    category: { type: String, enum: ASSESSMENT_CATEGORY_KEYS, required: true },
    topic: { type: String, trim: true, maxlength: 80 },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    prompt: { type: String, required: true, maxlength: 2000 },
    options: {
      type: [{ type: String, maxlength: 500 }],
      validate: { validator: (v) => v.length >= 2 && v.length <= 6, message: "Questions need 2–6 options" },
    },
    answer: {
      type: Number,
      required: true,
      min: 0,
      select: false,
      validate: {
        validator(v) {
          // In update validators `this` is the Query (whose .options are query options), so read the update instead.
          const options = this instanceof mongoose.Query ? (this.getUpdate()?.$set?.options ?? this.getUpdate()?.options) : this.options;
          return !Array.isArray(options) || v < options.length;
        },
        message: "answer must point at one of the options",
      },
    },
    explanation: { type: String, maxlength: 2000, select: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: USER_REF, default: null },
  },
  baseOptions,
);
questionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
export const Question = model("Question", questionSchema, "questions");

/* assessment_attempts — created and scored only on the server. */
const attemptSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true },
    assessmentId: { type: ObjectId, ref: "Assessment", required: true },
    questionIds: [{ type: ObjectId, ref: "Question" }],
    answers: { type: [{ type: Number, default: null }], default: [] },
    flagged: { type: [Number], default: [] }, // question positions marked for review
    difficulty: { type: String, enum: ["easy", "medium", "hard", "mixed"], default: "mixed" },
    status: { type: String, enum: ["in_progress", "submitted", "expired"], default: "in_progress" },
    startedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    submittedAt: Date,
    score: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, default: 0 },
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    passed: { type: Boolean, default: false },
    topicScores: { type: Map, of: new Schema({ correct: Number, total: Number }, { _id: false }), default: {} },
    xpAwarded: { type: Number, min: 0, default: 0 },
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);
attemptSchema.index({ userId: 1, createdAt: -1 });
attemptSchema.index({ userId: 1, assessmentId: 1, status: 1 });
attemptSchema.index({ assessmentId: 1, percentage: -1 });
export const AssessmentAttempt = model("AssessmentAttempt", attemptSchema, "assessment_attempts");
