import "server-only";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ProblemSubmission, XpEvent } from "@/lib/db/models";
import { APP_TIMEZONE, dayKey, dayStart, monthStartKey, shiftDay, weekStartKey } from "@/lib/utils/time";
import { XP_RULES, levelProgress, xpForLevel } from "@/lib/utils/xp";
import { badgeProgress } from "./achievements";
import { xpRankOf } from "./leaderboard";

const DEFAULT_GOALS = { weeklyProblems: 5, weeklyActiveDays: 4, monthlyXp: 500 };

async function windowStats(uid, start, end = null) {
  const range = end ? { $gte: start, $lt: end } : { $gte: start };
  const [xp, solvedIds, days] = await Promise.all([
    XpEvent.aggregate([{ $match: { userId: uid, createdAt: range } }, { $group: { _id: null, xp: { $sum: "$amount" } } }]),
    ProblemSubmission.distinct("problemId", { userId: uid, status: "accepted", createdAt: range }),
    ProblemSubmission.aggregate([
      { $match: { userId: uid, executionMode: { $ne: "demo" }, createdAt: range } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: APP_TIMEZONE } } } },
    ]),
  ]);
  return { xp: xp[0]?.xp ?? 0, solved: solvedIds.length, activeDays: days.length };
}

/**
 * Everything on the progress page: level, global rank, weekly goals, monthly
 * progress against last month, upcoming milestones and every badge with progress.
 */
export async function getProgress(user, profile) {
  await connectToDatabase();
  const uid = new ObjectId(user.id);
  const today = dayKey();
  const weekKey = weekStartKey(today);
  const monthKey = monthStartKey(today);
  const lastMonthKey = monthStartKey(shiftDay(monthKey, 1));
  const goals = { ...DEFAULT_GOALS, ...(profile.goals ?? {}) };

  const [week, month, lastMonth, badges, rank] = await Promise.all([
    windowStats(uid, dayStart(weekKey)),
    windowStats(uid, dayStart(monthKey)),
    windowStats(uid, dayStart(lastMonthKey), dayStart(monthKey)),
    badgeProgress(uid),
    xpRankOf(uid),
  ]);

  const xp = profile.xp ?? 0;
  const level = levelProgress(xp);
  const streak = profile.streak ?? { current: 0, longest: 0 };
  const nextStreak = Object.keys(XP_RULES.streakMilestones).map(Number).find((d) => d > streak.current) ?? null;
  const daysLeftInWeek = 7 - Math.round((dayStart(today) - dayStart(weekKey)) / 86_400_000) - 1;

  const milestones = [
    { kind: "level", title: `Reach level ${level.level + 1}`, detail: `${level.toNext.toLocaleString("en-IN")} XP to go`, percent: level.percent },
    nextStreak && {
      kind: "streak",
      title: `${nextStreak}-day coding streak`,
      detail: `${nextStreak - streak.current} more day${nextStreak - streak.current === 1 ? "" : "s"} · +${XP_RULES.streakMilestones[nextStreak]} XP`,
      percent: Math.round((streak.current / nextStreak) * 100),
    },
    ...badges
      .filter((b) => !b.earned && b.progress.kind === "count" && b.progress.percent > 0)
      .sort((a, b) => b.progress.percent - a.progress.percent)
      .slice(0, 3)
      .map((b) => ({ kind: "badge", title: b.name, detail: `${b.progress.value} of ${b.progress.threshold} · +${b.xpBonus} XP`, percent: b.progress.percent, icon: b.icon })),
  ].filter(Boolean);

  return JSON.parse(
    JSON.stringify({
      level: { ...level, xp, skillLevel: profile.skillLevel, nextLevelAt: xpForLevel(level.level + 1) },
      rank,
      streak,
      goals,
      week: { ...week, start: weekKey, daysLeft: Math.max(0, daysLeftInWeek) },
      month: { ...month, start: monthKey, last: lastMonth },
      milestones,
      badges,
    }),
  );
}
