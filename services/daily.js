import "server-only";
import { ObjectId } from "mongodb";
import { problems as demoProblems } from "@/data/problems";
import { connectToDatabase } from "@/lib/db/mongoose";
import { DailyChallenge, DailyChallengeCompletion, Problem } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { dayKey, lastDays } from "@/lib/utils/time";
import { XP_RULES } from "@/lib/utils/xp";

/**
 * Daily coding challenge: one problem per calendar day (platform time zone).
 * Admin-picked days are stored in daily_challenges; any day without one gets a
 * deterministic pick from the published catalogue, saved the first time it is
 * requested so everyone sees the same problem.
 */

const dayNumber = (key) => Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);

function shape(problem, date, bonusXp) {
  return {
    date,
    bonusXp,
    problem: { id: String(problem._id ?? problem.id), slug: problem.slug, title: problem.title, difficulty: problem.difficulty, topics: problem.topics ?? [], xpReward: problem.xpReward },
  };
}

export async function getChallengeFor(date = dayKey()) {
  if (!isDatabaseConfigured()) {
    const p = demoProblems[dayNumber(date) % demoProblems.length];
    return shape(p, date, XP_RULES.dailyChallengeBonus);
  }
  await connectToDatabase();
  let challenge = await DailyChallenge.findOne({ date }).lean();
  if (!challenge) {
    const catalogue = await Problem.find({ isPublished: true }, "_id").sort({ _id: 1 }).lean();
    if (!catalogue.length) return null;
    const pick = catalogue[dayNumber(date) % catalogue.length]._id;
    challenge = await DailyChallenge.findOneAndUpdate(
      { date },
      { $setOnInsert: { date, problemId: pick, bonusXp: XP_RULES.dailyChallengeBonus } },
      { upsert: true, returnDocument: "after" },
    ).lean();
  }
  const problem = await Problem.findById(challenge.problemId, "slug title difficulty topics xpReward").lean();
  return problem ? shape(problem, date, challenge.bonusXp) : null;
}

/** Today's challenge plus whether this viewer has completed it. */
export async function getTodayForViewer(viewerId) {
  const today = dayKey();
  const challenge = await getChallengeFor(today);
  if (!challenge) return null;
  let completed = false;
  if (viewerId && isDatabaseConfigured()) {
    completed = Boolean(await DailyChallengeCompletion.exists({ userId: new ObjectId(viewerId), date: today }));
  }
  return { ...challenge, completed };
}

/** The last `days` challenges, newest first, with this viewer's completion. */
export async function getHistory(viewerId, days = 14) {
  const keys = lastDays(days).reverse();
  const challenges = [];
  for (const key of keys) {
    const c = await getChallengeFor(key);
    if (c) challenges.push(c);
  }
  let done = new Map();
  if (viewerId && isDatabaseConfigured()) {
    const rows = await DailyChallengeCompletion.find({ userId: new ObjectId(viewerId), date: { $in: keys } }).lean();
    done = new Map(rows.map((r) => [r.date, r]));
  }
  return challenges.map((c) => ({ ...c, completed: done.has(c.date), completedAt: done.get(c.date)?.createdAt ?? null, xpAwarded: done.get(c.date)?.xpAwarded ?? 0 }));
}
