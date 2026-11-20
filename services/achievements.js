import "server-only";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Achievement,
  Application,
  AssessmentAttempt,
  Contest,
  ContestParticipant,
  Problem,
  ProblemSubmission,
  Profile,
  UserAchievement,
} from "@/lib/db/models";
import { profileCompletion } from "@/lib/utils/profileCompletion";
import { notify } from "./activity";
import { awardXp } from "./gamification";

/**
 * Badge rules live in the achievements collection as { criteria: { type, threshold } }.
 * This computes the student's current value for every criteria type from
 * stored data and awards anything newly earned (badge + its XP bonus +
 * a notification). Earning is idempotent thanks to the unique (user, badge) index.
 */
export async function achievementStats(userId) {
  await connectToDatabase();
  const uid = new ObjectId(String(userId));
  const [profile, authUser, solvedIds, participations, finalized, attempts, applications] = await Promise.all([
    Profile.findOne({ userId: uid }).lean(),
    mongoose.connection.collection("user").findOne({ _id: uid }, { projection: { image: 1, role: 1 } }),
    ProblemSubmission.distinct("problemId", { userId: uid, status: "accepted" }),
    ContestParticipant.find({ userId: uid, $or: [{ submissions: { $gt: 0 } }, { solvedCount: { $gt: 0 } }] }, { contestId: 1, rank: 1 }).lean(),
    Contest.find({ finalizedAt: { $ne: null } }, { _id: 1 }).lean(),
    AssessmentAttempt.find({ userId: uid, status: { $in: ["submitted", "expired"] } }, { percentage: 1 }).lean(),
    Application.countDocuments({ studentId: uid }),
  ]);
  const hardSolved = solvedIds.length ? await Problem.countDocuments({ _id: { $in: solvedIds }, difficulty: "hard" }) : 0;
  const finalizedSet = new Set(finalized.map((c) => String(c._id)));
  const ranks = participations.filter((p) => p.rank && finalizedSet.has(String(p.contestId))).map((p) => p.rank);

  return {
    problems_solved: solvedIds.length,
    hard_solved: hardSolved,
    streak_days: profile?.streak?.longest ?? 0,
    contests_joined: participations.length,
    // Lower is better for rank: report the best (smallest), or null if none yet.
    contest_best_rank: ranks.length ? Math.min(...ranks) : null,
    assessments_completed: attempts.length,
    assessment_best_percentage: attempts.length ? Math.max(...attempts.map((a) => a.percentage)) : 0,
    profile_completion: profile ? profileCompletion(profile, { role: authUser?.role ?? "student", image: authUser?.image }).percent : 0,
    applications_submitted: applications,
  };
}

/** Whether `value` meets a criteria threshold (rank criteria are "at most"). */
export function meets(type, value, threshold) {
  if (value === null || value === undefined) return false;
  return type === "contest_best_rank" ? value <= threshold : value >= threshold;
}

/** Awards any newly met badges. Returns [{ code, name, icon, xpBonus }]. Students only. */
export async function evaluateAchievements(userId) {
  await connectToDatabase();
  const uid = new ObjectId(String(userId));
  const [stats, all, owned] = await Promise.all([
    achievementStats(uid),
    Achievement.find({}).lean(),
    UserAchievement.find({ userId: uid }, { achievementId: 1 }).lean(),
  ]);
  const ownedSet = new Set(owned.map((o) => String(o.achievementId)));
  const earned = [];

  for (const a of all) {
    if (ownedSet.has(String(a._id))) continue;
    if (!meets(a.criteria.type, stats[a.criteria.type], a.criteria.threshold)) continue;
    try {
      await UserAchievement.create({ userId: uid, achievementId: a._id, earnedAt: new Date() });
    } catch (error) {
      if (error?.code === 11000) continue; // earned concurrently
      throw error;
    }
    if (a.xpBonus > 0) await awardXp(uid, { amount: a.xpBonus, reason: "achievement", refId: a.code });
    await notify(uid, { type: "achievement", title: `Badge earned: ${a.name}`, body: `${a.description}${a.xpBonus ? ` +${a.xpBonus} XP` : ""}`, link: "/achievements" });
    earned.push({ code: a.code, name: a.name, icon: a.icon, xpBonus: a.xpBonus });
  }
  return earned;
}

/** All badges with this student's progress toward each (for the progress page). */
export async function badgeProgress(userId) {
  await connectToDatabase();
  const uid = new ObjectId(String(userId));
  const [stats, all, owned] = await Promise.all([
    achievementStats(uid),
    Achievement.find({}).sort({ category: 1, "criteria.threshold": 1 }).lean(),
    UserAchievement.find({ userId: uid }).lean(),
  ]);
  const earnedAt = new Map(owned.map((o) => [String(o.achievementId), o.earnedAt]));
  return all.map((a) => {
    const value = stats[a.criteria.type];
    const rank = a.criteria.type === "contest_best_rank";
    const percent = earnedAt.has(String(a._id))
      ? 100
      : rank
        ? value === null ? 0 : Math.max(0, Math.min(99, Math.round((a.criteria.threshold / value) * 100)))
        : Math.min(99, Math.round(((value ?? 0) / a.criteria.threshold) * 100));
    return {
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      xpBonus: a.xpBonus,
      earned: earnedAt.has(String(a._id)),
      earnedAt: earnedAt.get(String(a._id)) ?? null,
      progress: { value: value ?? (rank ? null : 0), threshold: a.criteria.threshold, percent, kind: rank ? "rank" : "count" },
    };
  });
}
