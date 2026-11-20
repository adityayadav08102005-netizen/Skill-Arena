import { ObjectId, Schema, USER_REF, baseOptions, model } from "./_shared.js";

const achievementSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, maxlength: 300 },
    icon: { type: String, maxlength: 40 }, // lucide icon name
    category: { type: String, enum: ["coding", "streak", "contest", "assessment", "profile", "career"], required: true },
    criteria: {
      type: { type: String, required: true },
      threshold: { type: Number, required: true },
    },
    xpBonus: { type: Number, min: 0, default: 0 },
  },
  baseOptions,
);
export const Achievement = model("Achievement", achievementSchema, "achievements");

const userAchievementSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true },
    achievementId: { type: ObjectId, ref: "Achievement", required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  baseOptions,
);
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
export const UserAchievement = model("UserAchievement", userAchievementSchema, "user_achievements");

/*
 * xp_events — append-only XP ledger (added beyond the spec's table list).
 * Every XP change is written here by the server; the unique key stops the same
 * reward being granted twice, and weekly/monthly leaderboards sum this ledger.
 */
const xpEventSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true },
    amount: { type: Number, required: true },
    reason: {
      type: String,
      enum: [
        "problem_solved", "daily_challenge", "contest_participation", "assessment_passed",
        "assessment_milestone", "streak_milestone", "profile_complete", "achievement", "admin_adjustment",
      ],
      required: true,
    },
    refId: { type: String, required: true }, // e.g. problem id, contest id, "streak-7"
    isSample: { type: Boolean, default: false },
  },
  { ...baseOptions, timestamps: { createdAt: true, updatedAt: false } },
);
xpEventSchema.index({ userId: 1, reason: 1, refId: 1 }, { unique: true });
xpEventSchema.index({ createdAt: -1, userId: 1 });
export const XpEvent = model("XpEvent", xpEventSchema, "xp_events");
