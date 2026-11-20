import "server-only";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { buildDemoActivity } from "@/data/demo/activity";
import { demoStudents } from "@/data/demo/users";
import { rankBy } from "@/lib/contests/scoring";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ContestParticipant, ProblemSubmission, Profile, XpEvent } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { dayKey, dayStart, monthStartKey, weekStartKey } from "@/lib/utils/time";
import { publicIdentities } from "./people";

export const BOARDS = {
  xp: { label: "All-time XP", unit: "XP" },
  solved: { label: "Problems solved", unit: "solved" },
  contests: { label: "Contests", unit: "points" },
  weekly: { label: "This week", unit: "XP" },
  monthly: { label: "This month", unit: "XP" },
};

const TOP = 50;

function finish(sorted, identities, viewerId, extra = () => ({})) {
  const ranked = rankBy(sorted, (r) => r.value);
  const decorate = (r) => ({ ...(identities.get(String(r.userId)) ?? { name: "Student", userId: String(r.userId) }), rank: r.rank, value: r.value, ...extra(r) });
  const meRow = viewerId ? ranked.find((r) => String(r.userId) === String(viewerId)) : null;
  return { total: ranked.length, rows: ranked.slice(0, TOP).map(decorate), me: meRow ? decorate(meRow) : null };
}

/** All five leaderboards. Students only; private profiles are ranked but anonymised. */
export async function getLeaderboards(viewerId) {
  const today = dayKey();
  const weekStart = dayStart(weekStartKey(today));
  const monthStart = dayStart(monthStartKey(today));
  if (!isDatabaseConfigured()) return demoLeaderboards(weekStart, monthStart);

  await connectToDatabase();
  const students = await mongoose.connection.collection("user").find({ role: "student" }, { projection: { _id: 1 } }).toArray();
  const activeProfiles = await Profile.find(
    { userId: { $in: students.map((s) => s._id) }, onboardingComplete: true, isActive: true },
    { userId: 1, xp: 1, level: 1 },
  ).lean();
  const ids = activeProfiles.map((p) => p.userId);

  const [solved, contests, weekly, monthly] = await Promise.all([
    ProblemSubmission.aggregate([
      { $match: { status: "accepted", userId: { $in: ids } } },
      { $group: { _id: { u: "$userId", p: "$problemId" } } },
      { $group: { _id: "$_id.u", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]),
    ContestParticipant.aggregate([
      { $match: { userId: { $in: ids }, $or: [{ submissions: { $gt: 0 } }, { solvedCount: { $gt: 0 } }] } },
      { $group: { _id: "$userId", value: { $sum: "$score" }, contests: { $sum: 1 }, bestRank: { $min: "$rank" } } },
      { $sort: { value: -1 } },
    ]),
    XpEvent.aggregate([{ $match: { userId: { $in: ids }, createdAt: { $gte: weekStart } } }, { $group: { _id: "$userId", value: { $sum: "$amount" } } }, { $sort: { value: -1 } }]),
    XpEvent.aggregate([{ $match: { userId: { $in: ids }, createdAt: { $gte: monthStart } } }, { $group: { _id: "$userId", value: { $sum: "$amount" } } }, { $sort: { value: -1 } }]),
  ]);

  const xpRows = activeProfiles.map((p) => ({ userId: p.userId, value: p.xp ?? 0, level: p.level })).sort((a, b) => b.value - a.value);
  const asRows = (agg) => agg.filter((r) => r.value > 0).map((r) => ({ userId: r._id, value: r.value, contests: r.contests, bestRank: r.bestRank }));
  const lists = { xp: xpRows, solved: asRows(solved), contests: asRows(contests), weekly: asRows(weekly), monthly: asRows(monthly) };

  const neededIds = new Set();
  for (const list of Object.values(lists)) list.slice(0, TOP).forEach((r) => neededIds.add(String(r.userId)));
  if (viewerId) neededIds.add(String(viewerId));
  const identities = await publicIdentities([...neededIds], viewerId);

  return JSON.parse(
    JSON.stringify({
      mode: "database",
      weekStart,
      monthStart,
      boards: {
        xp: { ...BOARDS.xp, ...finish(lists.xp, identities, viewerId, (r) => ({ level: r.level })) },
        solved: { ...BOARDS.solved, ...finish(lists.solved, identities, viewerId) },
        contests: { ...BOARDS.contests, ...finish(lists.contests, identities, viewerId, (r) => ({ contests: r.contests, bestRank: r.bestRank })) },
        weekly: { ...BOARDS.weekly, ...finish(lists.weekly, identities, viewerId) },
        monthly: { ...BOARDS.monthly, ...finish(lists.monthly, identities, viewerId) },
      },
    }),
  );
}

/** Your rank on the all-time XP board (for the progress page). */
export async function xpRankOf(userId) {
  await connectToDatabase();
  const students = await mongoose.connection.collection("user").find({ role: "student" }, { projection: { _id: 1 } }).toArray();
  const ids = students.map((s) => s._id);
  const me = await Profile.findOne({ userId: new ObjectId(String(userId)) }, { xp: 1 }).lean();
  const filter = { userId: { $in: ids }, onboardingComplete: true, isActive: true };
  const [ahead, total] = await Promise.all([Profile.countDocuments({ ...filter, xp: { $gt: me?.xp ?? 0 } }), Profile.countDocuments(filter)]);
  return { rank: ahead + 1, total };
}

/** Same boards built from the bundled sample data (demo mode). */
function demoLeaderboards(weekStart, monthStart) {
  const activity = buildDemoActivity();
  const ident = new Map(demoStudents.map((s) => [s.id, { userId: s.id, name: s.name, isPublic: true, hasAvatar: false, image: null, profileHref: null }]));
  const sum = (since) => {
    const totals = new Map();
    for (const s of activity.submissions) if (s.xpAwarded && s.createdAt >= since) totals.set(s.userId, (totals.get(s.userId) ?? 0) + s.xpAwarded);
    for (const a of activity.attempts) if (a.xpAwarded && a.submittedAt >= since) totals.set(a.userId, (totals.get(a.userId) ?? 0) + a.xpAwarded);
    return [...totals].map(([userId, value]) => ({ userId, value })).sort((a, b) => b.value - a.value);
  };
  const stats = activity.stats;
  const contestRows = activity.contestEntries.map((e) => ({ userId: e.userId, value: e.score, contests: 1, bestRank: e.rank })).sort((a, b) => b.value - a.value);
  return JSON.parse(
    JSON.stringify({
      mode: "demo",
      weekStart,
      monthStart,
      boards: {
        xp: { ...BOARDS.xp, ...finish(stats.map((s) => ({ userId: s.userId, value: s.xp, level: s.level })).sort((a, b) => b.value - a.value), ident, null, (r) => ({ level: r.level })) },
        solved: { ...BOARDS.solved, ...finish(stats.map((s) => ({ userId: s.userId, value: s.solvedCount })).sort((a, b) => b.value - a.value), ident, null) },
        contests: { ...BOARDS.contests, ...finish(contestRows, ident, null, (r) => ({ contests: r.contests, bestRank: r.bestRank })) },
        weekly: { ...BOARDS.weekly, ...finish(sum(weekStart), ident, null) },
        monthly: { ...BOARDS.monthly, ...finish(sum(monthStart), ident, null) },
      },
    }),
  );
}
