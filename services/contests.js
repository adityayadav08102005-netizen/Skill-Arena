import "server-only";
import { ObjectId } from "mongodb";
import { computeStandings } from "@/lib/contests/scoring";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Contest, ContestParticipant, ContestSubmission, Notification, Problem } from "@/lib/db/models";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { XP_RULES } from "@/lib/utils/xp";
import { evaluateAchievements } from "./achievements";
import { logActivity, notify } from "./activity";
import { awardXp } from "./gamification";
import { publicIdentities } from "./people";
import { getProblemWithTests } from "./problems";
import { SubmissionError, applyRewards, judgeAndRecord, verdictPayload } from "./submissions";

export class ContestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));

export function contestState(contest, now = new Date()) {
  if (now < contest.startsAt) return "upcoming";
  if (now < contest.endsAt) return "live";
  return "ended";
}

function basics(c, now) {
  return {
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    description: c.description,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    durationMinutes: Math.round((c.endsAt - c.startsAt) / 60_000),
    problemCount: c.problems.length,
    totalPoints: c.problems.reduce((s, p) => s + p.points, 0),
    penaltyMinutesPerWrong: c.penaltyMinutesPerWrong,
    state: contestState(c, now),
  };
}

/** Live, upcoming and past contests with the viewer's registration and results. */
export async function listContests(viewerId) {
  await connectToDatabase();
  const now = new Date();
  const contests = await Contest.find({ isPublished: true }).sort({ startsAt: 1 }).lean();
  const ids = contests.map((c) => c._id);
  const [counts, mine] = await Promise.all([
    ContestParticipant.aggregate([{ $match: { contestId: { $in: ids } } }, { $group: { _id: "$contestId", n: { $sum: 1 } } }]),
    viewerId ? ContestParticipant.find({ userId: oid(viewerId), contestId: { $in: ids } }).lean() : [],
  ]);
  const countOf = new Map(counts.map((c) => [String(c._id), c.n]));
  const mineOf = new Map(mine.map((p) => [String(p.contestId), p]));
  const rows = contests.map((c) => {
    const p = mineOf.get(String(c._id));
    return {
      ...basics(c, now),
      participants: countOf.get(String(c._id)) ?? 0,
      registered: Boolean(p),
      myResult: p ? { score: p.score, rank: p.rank, solvedCount: p.solvedCount } : null,
    };
  });
  return plain({
    live: rows.filter((r) => r.state === "live"),
    upcoming: rows.filter((r) => r.state === "upcoming"),
    past: rows.filter((r) => r.state === "ended").reverse().slice(0, 20),
  });
}

async function findContest(slug) {
  await connectToDatabase();
  const contest = await Contest.findOne({ slug, isPublished: true }).lean();
  if (!contest) throw new ContestError("Contest not found.", 404);
  return contest;
}

/**
 * Contest page data. Problems are hidden until the contest starts.
 * Per-problem status is the viewer's own (solved / attempts) during and after the contest.
 */
export async function getContest(slug, viewer) {
  const contest = await findContest(slug);
  const now = new Date();
  const state = contestState(contest, now);
  if (state === "ended") await finalizeIfEnded(contest);

  const participant = viewer ? await ContestParticipant.findOne({ contestId: contest._id, userId: oid(viewer.id) }).lean() : null;
  let problems = [];
  if (state !== "upcoming") {
    const docs = await Problem.find({ _id: { $in: contest.problems.map((p) => p.problemId) } }, "slug title difficulty topics").lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const mySubs = participant
      ? await ContestSubmission.find({ contestId: contest._id, userId: oid(viewer.id) }, { problemId: 1, accepted: 1, status: 1 }).lean()
      : [];
    problems = contest.problems
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((cp, i) => {
        const d = byId.get(String(cp.problemId));
        const subs = mySubs.filter((s) => String(s.problemId) === String(cp.problemId));
        return {
          label: String.fromCharCode(65 + i),
          slug: d?.slug,
          title: d?.title ?? "Problem",
          difficulty: d?.difficulty,
          points: cp.points,
          solved: subs.some((s) => s.accepted),
          attempts: subs.filter((s) => !["compilation_error", "internal_error"].includes(s.status)).length,
        };
      });
  }
  const participants = await ContestParticipant.countDocuments({ contestId: contest._id });
  return plain({
    ...basics(contest, now),
    serverNow: now,
    participants,
    finalized: Boolean(contest.finalizedAt),
    registered: Boolean(participant),
    me: participant ? { score: participant.score, rank: participant.rank, solvedCount: participant.solvedCount, penaltyMinutes: participant.penaltyMinutes } : null,
    problems,
  });
}

export async function register(user, slug) {
  const contest = await findContest(slug);
  if (contestState(contest) === "ended") throw new ContestError("This contest has already ended.", 409);
  const result = await ContestParticipant.updateOne(
    { contestId: contest._id, userId: oid(user.id) },
    { $setOnInsert: { contestId: contest._id, userId: oid(user.id) } },
    { upsert: true },
  );
  if (result.upsertedCount) {
    await logActivity(user.id, "contest.registered", { entityType: "contest", entityId: contest._id });
    await notify(user.id, {
      type: "contest_reminder",
      title: `Registered for ${contest.title}`,
      body: `Starts ${contest.startsAt.toLocaleString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}.`,
      link: `/contests/${contest.slug}`,
    });
  }
  return { registered: true };
}

export async function unregister(user, slug) {
  const contest = await findContest(slug);
  if (contestState(contest) !== "upcoming") throw new ContestError("You can only unregister before the contest starts.", 409);
  await ContestParticipant.deleteOne({ contestId: contest._id, userId: oid(user.id), submissions: 0 });
  await logActivity(user.id, "contest.unregistered", { entityType: "contest", entityId: contest._id });
  return { registered: false };
}

/**
 * Recomputes every participant's score, penalty, solved count and rank from
 * contest_submissions (the source of truth) and stores them. Contests without
 * any recorded submissions (e.g. sample data) keep their stored results.
 */
export async function recomputeStandings(contest) {
  const subs = await ContestSubmission.find({ contestId: contest._id }, { userId: 1, problemId: 1, status: 1, minute: 1 }).sort({ createdAt: 1, _id: 1 }).lean();
  if (!subs.length) return null;
  const participants = await ContestParticipant.find({ contestId: contest._id }, { userId: 1 }).lean();
  const points = new Map(contest.problems.map((p) => [String(p.problemId), p.points]));
  const rows = computeStandings(subs, points, { penaltyPerWrong: contest.penaltyMinutesPerWrong, participants: participants.map((p) => String(p.userId)) });
  await ContestParticipant.bulkWrite(
    rows.map((r) => ({
      updateOne: {
        filter: { contestId: contest._id, userId: oid(r.userId) },
        update: { $set: { score: r.score, solvedCount: r.solvedCount, penaltyMinutes: r.penaltyMinutes, submissions: r.submissions, rank: r.rank } },
        upsert: true,
      },
    })),
  );
  return rows;
}

/** Applies final ranks, badges and result notifications once, after the contest ends. */
export async function finalizeIfEnded(contest) {
  if (contest.finalizedAt || contestState(contest) !== "ended") return false;
  const claimed = await Contest.findOneAndUpdate({ _id: contest._id, finalizedAt: null }, { $set: { finalizedAt: new Date() } });
  if (!claimed) return false; // another request finalized it
  await recomputeStandings(contest);
  const active = await ContestParticipant.find({ contestId: contest._id, $or: [{ submissions: { $gt: 0 } }, { solvedCount: { $gt: 0 } }] }).lean();
  for (const p of active) {
    await evaluateAchievements(p.userId);
    await notify(p.userId, {
      type: "contest_reminder",
      title: `${contest.title} results`,
      body: p.rank ? `You finished #${p.rank} with ${p.score} points.` : `You scored ${p.score} points.`,
      link: `/contests/${contest.slug}`,
    });
  }
  return true;
}

/** Ranked standings (top `limit` plus the viewer's own row), with privacy-aware names. */
export async function getStandings(slug, viewerId, { limit = 50 } = {}) {
  const contest = await findContest(slug);
  if (contestState(contest) === "ended") await finalizeIfEnded(contest);
  const all = await ContestParticipant.find({ contestId: contest._id }, { userId: 1, score: 1, solvedCount: 1, penaltyMinutes: 1, rank: 1, submissions: 1 })
    .sort({ score: -1, penaltyMinutes: 1, _id: 1 })
    .lean();
  // Only students who actually competed appear in the standings.
  const ranked = all.filter((p) => p.submissions > 0 || p.solvedCount > 0);
  const top = ranked.slice(0, limit);
  const mine = viewerId ? ranked.find((p) => String(p.userId) === String(viewerId)) : null;
  const names = await publicIdentities([...top, ...(mine ? [mine] : [])].map((p) => p.userId), viewerId);
  const shape = (p, i) => ({ ...names.get(String(p.userId)), rank: p.rank ?? i + 1, score: p.score, solvedCount: p.solvedCount, penaltyMinutes: p.penaltyMinutes });
  return plain({
    state: contestState(contest),
    updatedAt: new Date(),
    participants: all.length,
    rows: top.map(shape),
    me: mine ? shape(mine, ranked.indexOf(mine)) : null,
  });
}

/** Contest problem for the workspace: only once the contest has started, only problems in it. */
export async function getContestProblemRef(slug, problemSlug) {
  const contest = await findContest(slug);
  const state = contestState(contest);
  if (state === "upcoming") throw new ContestError("This contest hasn't started yet.", 403);
  const problem = await Problem.findOne({ slug: problemSlug }, "_id").lean();
  const entry = problem && contest.problems.find((p) => String(p.problemId) === String(problem._id));
  if (!entry) throw new ContestError("That problem isn't part of this contest.", 404);
  return { contest, state, points: entry.points };
}

/**
 * Contest submission: judged like a library submission, then recorded for
 * the contest, standings recomputed, and participation XP granted once.
 * Only during the live window, only for registered students.
 */
export async function contestSubmit(user, slug, { problemSlug, language, code }) {
  const { contest, state, points } = await getContestProblemRef(slug, problemSlug);
  if (state !== "live") throw new ContestError("This contest has ended. Practise the problem in AlgoArena instead.", 409);
  const participant = await ContestParticipant.findOne({ contestId: contest._id, userId: oid(user.id) }).lean();
  if (!participant) throw new ContestError("Register for the contest before submitting.", 403);

  const problem = await getProblemWithTests(problemSlug, { allowUnpublished: true });
  if (!problem) throw new SubmissionError("Problem not found.", 404);

  const judged = await judgeAndRecord(user, problem, { language, code, contestId: contest._id });
  if (!judged.executed) {
    return {
      mode: "demo",
      executed: false,
      status: "not_executed",
      submissionId: String(judged.submission._id),
      message: "Demo mode: no code runner is configured, so contest submissions are saved but can't be judged or scored.",
    };
  }

  const now = new Date();
  const minute = Math.max(0, Math.floor((now - contest.startsAt) / 60_000));
  const accepted = judged.verdict.status === "accepted";
  const alreadySolved = accepted && (await ContestSubmission.exists({ contestId: contest._id, userId: oid(user.id), problemId: problem._id, accepted: true }));
  await ContestSubmission.create({
    contestId: contest._id,
    userId: oid(user.id),
    problemId: problem._id,
    submissionId: judged.submission._id,
    language,
    status: judged.verdict.status,
    accepted,
    minute,
    pointsAwarded: accepted && !alreadySolved ? points : 0,
  });

  const rows = await recomputeStandings(contest);
  const me = rows?.find((r) => r.userId === String(user.id));

  const participation = await awardXp(user.id, { amount: XP_RULES.contestParticipation, reason: "contest_participation", refId: String(contest._id) });
  const { rewards, streak } = await applyRewards(user, problem, judged.submission, { accepted, daily: null });
  if (participation.awarded) rewards.contestXp = XP_RULES.contestParticipation;

  await logActivity(user.id, `contest.submission.${judged.verdict.status}`, { entityType: "contest", entityId: contest._id, metadata: { problem: problemSlug } });
  return {
    ...verdictPayload(judged),
    rewards,
    streak,
    contest: me ? { score: me.score, rank: me.rank, solvedCount: me.solvedCount, penaltyMinutes: me.penaltyMinutes, pointsAwarded: accepted && !alreadySolved ? points : 0 } : null,
  };
}

/**
 * Reminder notifications for contests the student registered for that start
 * within the next 24 hours. Called when the student opens the dashboard or the
 * contests page; each reminder is created at most once.
 */
export async function ensureContestReminders(userId) {
  await connectToDatabase();
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 3_600_000);
  const regs = await ContestParticipant.find({ userId: oid(userId) }, { contestId: 1 }).lean();
  if (!regs.length) return;
  const contests = await Contest.find({ _id: { $in: regs.map((r) => r.contestId) }, startsAt: { $gt: now, $lte: soon }, isPublished: true }).lean();
  for (const c of contests) {
    const link = `/contests/${c.slug}`;
    const exists = await Notification.exists({ userId: oid(userId), type: "contest_reminder", link, title: { $regex: /starts soon$/ } });
    if (!exists) {
      await notify(userId, { type: "contest_reminder", title: `${c.title} starts soon`, body: "It starts within 24 hours. Good luck!", link });
    }
  }
}
