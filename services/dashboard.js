import "server-only";
import { ObjectId } from "mongodb";
import { ASSESSMENT_CATEGORIES } from "@/data/assessments";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Achievement,
  Application,
  AssessmentAttempt,
  Contest,
  ContestParticipant,
  Opportunity,
  Problem,
  ProblemSubmission,
  SavedOpportunity,
  UserAchievement,
  XpEvent,
} from "@/lib/db/models";
import { profileCompletion } from "@/lib/utils/profileCompletion";
import { APP_TIMEZONE, dayKey, lastDays } from "@/lib/utils/time";
import { levelProgress } from "@/lib/utils/xp";
import { getRecommender } from "./recommendations";

const HEATMAP_WEEKS = 18;
const XP_DAYS = 30;
const CATEGORY_LABEL = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c.key, c.label]));
const plain = (v) => JSON.parse(JSON.stringify(v));

/**
 * Everything the student dashboard shows, computed from stored data.
 * Queries run in parallel; each section is independent so a new account
 * simply gets empty sections.
 */
export async function getStudentDashboard(user, profile) {
  await connectToDatabase();
  const uid = new ObjectId(user.id);
  const now = new Date();
  const today = dayKey(now);
  const heatDays = lastDays(HEATMAP_WEEKS * 7, today);
  const xpDays = lastDays(XP_DAYS, today);
  const heatStart = new Date(Date.now() - (HEATMAP_WEEKS * 7 + 1) * 86_400_000);
  const xpStart = new Date(Date.now() - (XP_DAYS + 1) * 86_400_000);

  const [
    submissionTotals,
    solvedIds,
    attemptedIds,
    heatRows,
    xpRows,
    recentSubs,
    allProblems,
    attempts,
    earned,
    achievementCount,
    applications,
    statusCounts,
    saved,
    contests,
    myContests,
    candidates,
  ] = await Promise.all([
    ProblemSubmission.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: null, total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } } } },
    ]),
    ProblemSubmission.distinct("problemId", { userId: uid, status: "accepted" }),
    ProblemSubmission.distinct("problemId", { userId: uid }),
    ProblemSubmission.aggregate([
      { $match: { userId: uid, createdAt: { $gte: heatStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: APP_TIMEZONE } }, count: { $sum: 1 } } },
    ]),
    XpEvent.aggregate([
      { $match: { userId: uid, createdAt: { $gte: xpStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: APP_TIMEZONE } }, xp: { $sum: "$amount" } } },
    ]),
    ProblemSubmission.find({ userId: uid }).sort({ createdAt: -1 }).limit(6).populate("problemId", "title slug difficulty").lean(),
    Problem.find({ isPublished: true }, { difficulty: 1, topics: 1 }).lean(),
    AssessmentAttempt.find({ userId: uid, status: { $in: ["submitted", "expired"] } }).sort({ submittedAt: -1 }).populate("assessmentId", "title category").lean(),
    UserAchievement.find({ userId: uid }).sort({ earnedAt: -1 }).populate("achievementId").lean(),
    Achievement.countDocuments({}),
    Application.find({ studentId: uid }).sort({ appliedAt: -1 }).limit(5).populate("opportunityId", "title companyName workMode").lean(),
    Application.aggregate([{ $match: { studentId: uid } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    SavedOpportunity.find({ userId: uid }).sort({ createdAt: -1 }).limit(4).populate("opportunityId", "title companyName workMode location applicationDeadline status").lean(),
    Contest.find({ isPublished: true, endsAt: { $gt: now } }).sort({ startsAt: 1 }).limit(3).lean(),
    ContestParticipant.find({ userId: uid }).lean(),
    Opportunity.find({ status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: now } }] }).lean(),
  ]);

  // ── Coding stats ────────────────────────────────────────────────
  const problemById = new Map(allProblems.map((p) => [String(p._id), p]));
  const solved = solvedIds.map((id) => problemById.get(String(id))).filter(Boolean);
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const p of solved) byDifficulty[p.difficulty] += 1;
  const totals = submissionTotals[0] ?? { total: 0, accepted: 0 };

  const topicTotals = new Map();
  const topicSolved = new Map();
  for (const p of allProblems) for (const t of p.topics ?? []) topicTotals.set(t, (topicTotals.get(t) ?? 0) + 1);
  for (const p of solved) for (const t of p.topics ?? []) topicSolved.set(t, (topicSolved.get(t) ?? 0) + 1);
  const topics = [...topicTotals.entries()]
    .map(([topic, total]) => ({ topic, solved: topicSolved.get(topic) ?? 0, total, percent: Math.round(((topicSolved.get(topic) ?? 0) / total) * 100) }))
    .sort((a, b) => b.percent - a.percent || b.total - a.total || a.topic.localeCompare(b.topic));

  const heatMap = new Map(heatRows.map((r) => [r._id, r.count]));
  const heatmap = heatDays.map((day) => ({ day, count: heatMap.get(day) ?? 0 }));

  // ── XP over the last 30 days (cumulative) ───────────────────────
  const xpByDay = new Map(xpRows.map((r) => [r._id, r.xp]));
  const gainedInWindow = xpRows.reduce((s, r) => s + r.xp, 0);
  let running = Math.max(0, (profile.xp ?? 0) - gainedInWindow);
  const xpSeries = xpDays.map((day) => {
    const gained = xpByDay.get(day) ?? 0;
    running += gained;
    return { day, gained, total: running };
  });

  // ── Assessments ────────────────────────────────────────────────
  const bestByCategory = new Map();
  for (const a of attempts) {
    const cat = a.assessmentId?.category;
    if (!cat) continue;
    if (!bestByCategory.has(cat) || bestByCategory.get(cat) < a.percentage) bestByCategory.set(cat, a.percentage);
  }
  const assessmentScores = [...bestByCategory.entries()]
    .map(([category, best]) => ({ category, label: CATEGORY_LABEL[category] ?? category, best }))
    .sort((a, b) => b.best - a.best);
  const average = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : null;

  // ── Contests ───────────────────────────────────────────────────
  const registered = new Set(myContests.map((c) => String(c.contestId)));
  const upcomingContests = contests.map((c) => ({
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    live: c.startsAt <= now,
    problemCount: c.problems.length,
    durationMinutes: Math.round((c.endsAt - c.startsAt) / 60_000),
    registered: registered.has(String(c._id)),
  }));
  const contestsJoined = myContests.length;
  const bestRank = myContests.reduce((best, c) => (c.rank && (!best || c.rank < best) ? c.rank : best), null);

  // ── Careers ────────────────────────────────────────────────────
  const appliedIds = new Set(applications.map((a) => String(a.opportunityId?._id)));
  const allAppliedIds = new Set((await Application.distinct("opportunityId", { studentId: uid })).map(String));
  const recommendations = getRecommender()
    .recommend(profile, candidates, { now, excludeIds: allAppliedIds, limit: 4 })
    .map((r) => ({
      id: String(r.opportunity._id),
      title: r.opportunity.title,
      companyName: r.opportunity.companyName,
      workMode: r.opportunity.workMode,
      location: r.opportunity.location,
      source: r.opportunity.source,
      score: r.score,
      matchedSkills: r.matchedSkills,
      missingSkills: r.missingSkills,
      reasons: r.reasons,
    }));

  // ── Recent activity: merged timeline from real records ─────────
  const activity = [
    ...recentSubs
      .filter((s) => s.status === "accepted" && s.problemId)
      .map((s) => ({ type: "solved", at: s.createdAt, text: `Solved ${s.problemId.title}`, xp: s.xpAwarded || null })),
    ...attempts.slice(0, 5).map((a) => ({ type: "assessment", at: a.submittedAt, text: `Scored ${a.percentage}% in ${a.assessmentId?.title ?? "an assessment"}`, xp: a.xpAwarded || null })),
    ...applications.filter((a) => a.opportunityId).map((a) => ({ type: "application", at: a.appliedAt, text: `Applied to ${a.opportunityId.title} at ${a.opportunityId.companyName}` })),
    ...earned.slice(0, 5).filter((e) => e.achievementId).map((e) => ({ type: "achievement", at: e.earnedAt, text: `Earned the ${e.achievementId.name} badge` })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);

  return plain({
    generatedAt: now,
    today,
    user: { id: user.id, name: user.name },
    completion: profileCompletion(profile, user),
    xp: { total: profile.xp ?? 0, ...levelProgress(profile.xp ?? 0), skillLevel: profile.skillLevel, series: xpSeries, gainedInWindow },
    streak: profile.streak ?? { current: 0, longest: 0 },
    coding: {
      solved: solved.length,
      attempted: attemptedIds.length,
      submissions: totals.total,
      accepted: totals.accepted,
      accuracy: totals.total ? Math.round((totals.accepted / totals.total) * 100) : null,
      byDifficulty,
      totalProblems: allProblems.length,
      topics,
      heatmap,
      activeDays: heatmap.filter((d) => d.count > 0).length,
      recent: recentSubs.map((s) => ({
        id: String(s._id),
        title: s.problemId?.title ?? "Deleted problem",
        slug: s.problemId?.slug ?? null,
        difficulty: s.problemId?.difficulty,
        language: s.language,
        status: s.status,
        executionMode: s.executionMode,
        at: s.createdAt,
      })),
    },
    assessments: {
      taken: attempts.length,
      passed: attempts.filter((a) => a.passed).length,
      average,
      best: assessmentScores[0] ?? null,
      scores: assessmentScores,
    },
    contests: { upcoming: upcomingContests, joined: contestsJoined, bestRank },
    achievements: {
      earnedCount: earned.length,
      total: achievementCount,
      recent: earned
        .filter((e) => e.achievementId)
        .slice(0, 6)
        .map((e) => ({ code: e.achievementId.code, name: e.achievementId.name, description: e.achievementId.description, icon: e.achievementId.icon, category: e.achievementId.category, earnedAt: e.earnedAt })),
    },
    applications: {
      recent: applications
        .filter((a) => a.opportunityId)
        .map((a) => ({ id: String(a._id), title: a.opportunityId.title, companyName: a.opportunityId.companyName, status: a.status, appliedAt: a.appliedAt })),
      byStatus: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
      total: statusCounts.reduce((s, x) => s + x.count, 0),
      appliedIds: [...appliedIds],
    },
    saved: saved
      .filter((s) => s.opportunityId)
      .map((s) => ({
        id: String(s.opportunityId._id),
        title: s.opportunityId.title,
        companyName: s.opportunityId.companyName,
        workMode: s.opportunityId.workMode,
        deadline: s.opportunityId.applicationDeadline,
        closed: s.opportunityId.status !== "published" || (s.opportunityId.applicationDeadline && new Date(s.opportunityId.applicationDeadline) < now),
      })),
    recommendations,
    activity,
  });
}
