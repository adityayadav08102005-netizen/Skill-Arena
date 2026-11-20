import "server-only";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongoose";
import { DailyChallengeCompletion, ProblemSubmission } from "@/lib/db/models";
import { executionMode, isExecutionConfigured } from "@/lib/execution/engine";
import { runCustom, runTests } from "@/lib/execution/runner";
import { dayKey } from "@/lib/utils/time";
import { evaluateAchievements } from "./achievements";
import { logActivity } from "./activity";
import { getChallengeFor } from "./daily";
import { awardXp } from "./gamification";
import { getProblemWithTests } from "./problems";
import { recordCodingDay } from "./streaks";

export class SubmissionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const sampleTests = (problem) => problem.samples.map((s) => ({ input: s.input, output: s.output, hidden: false }));

/**
 * "Run": sample tests (or custom input). In demo mode nothing is executed —
 * the response says so explicitly and shows what the samples expect.
 */
export async function runCode({ slug, language, code, customInput }, { allowUnpublished = false } = {}) {
  const problem = await getProblemWithTests(slug, { allowUnpublished });
  if (!problem) throw new SubmissionError("Problem not found.", 404);

  if (!isExecutionConfigured()) {
    return {
      mode: "demo",
      executed: false,
      message: "Demo mode: no code runner is configured, so your code was not executed. These are the expected outputs for the sample tests.",
      samples: problem.samples.map((s, index) => ({ index, input: s.input, expected: s.output })),
    };
  }

  if (typeof customInput === "string") {
    return { mode: executionMode(), executed: true, custom: await runCustom({ language, code, input: customInput }) };
  }
  return { mode: executionMode(), executed: true, ...(await runTests({ language, code, tests: sampleTests(problem) })) };
}

/**
 * Judges `code` against sample + hidden tests and stores the submission.
 * In demo mode the code is stored as "not_executed" and never judged.
 * Returns { executed, submission, verdict, failed }.
 */
export async function judgeAndRecord(user, problem, { language, code, contestId = null, isDailyChallenge = false }) {
  const userId = new ObjectId(String(user.id));
  if (!isExecutionConfigured()) {
    const submission = await ProblemSubmission.create({
      userId,
      problemId: problem._id,
      contestId,
      language,
      code,
      status: "not_executed",
      totalCount: problem.samples.length + (problem.hiddenTests?.length ?? 0),
      executionMode: "demo",
      isDailyChallenge,
    });
    return { executed: false, submission, verdict: null, failed: null };
  }

  const tests = [...sampleTests(problem), ...(problem.hiddenTests ?? []).map((t) => ({ input: t.input, output: t.output, hidden: true }))];
  const verdict = await runTests({ language, code, tests });
  const failed = verdict.results.find((r) => !r.passed) ?? null;
  const submission = await ProblemSubmission.create({
    userId,
    problemId: problem._id,
    contestId,
    language,
    code,
    status: verdict.status,
    passedCount: verdict.passed,
    totalCount: verdict.total,
    runtimeMs: verdict.timeMs,
    memoryKb: verdict.memoryKb,
    failedTest: failed ? { index: failed.index, hidden: failed.hidden } : { index: null, hidden: null },
    compileOutput: verdict.compileOutput || null,
    executionMode: executionMode(),
    isDailyChallenge,
  });
  return { executed: true, submission, verdict, failed };
}

/**
 * Rewards shared by library and contest submissions: first-solve XP, the
 * daily-challenge bonus (library only), the coding streak and any newly earned
 * badges. Every XP grant goes through the ledger, so it happens at most once.
 */
export async function applyRewards(user, problem, submission, { accepted, daily }) {
  const userId = new ObjectId(String(user.id));
  const rewards = { solveXp: 0, dailyXp: 0, streakXp: 0, badgeXp: 0, badges: [], leveledUp: false, level: null, xp: null, firstSolve: false, dailyCompleted: false };
  const track = (r) => {
    if (r?.awarded) Object.assign(rewards, { leveledUp: rewards.leveledUp || r.leveledUp, level: r.level, xp: r.xp });
  };

  if (accepted) {
    const solve = await awardXp(userId, { amount: problem.xpReward, reason: "problem_solved", refId: String(problem._id) });
    if (solve.awarded) {
      rewards.solveXp = problem.xpReward;
      rewards.firstSolve = true;
    }
    track(solve);

    if (daily) {
      try {
        await DailyChallengeCompletion.create({ userId, date: daily.date, problemId: problem._id, submissionId: submission._id, xpAwarded: daily.bonusXp });
        const bonus = await awardXp(userId, { amount: daily.bonusXp, reason: "daily_challenge", refId: daily.date });
        if (bonus.awarded) {
          rewards.dailyXp = daily.bonusXp;
          rewards.dailyCompleted = true;
        }
        track(bonus);
      } catch (error) {
        if (error?.code !== 11000) throw error; // already completed today
      }
    }
    await ProblemSubmission.updateOne({ _id: submission._id }, { $set: { xpAwarded: rewards.solveXp + rewards.dailyXp } });
  }

  const streak = await recordCodingDay(userId); // any judged submission counts as a coding day
  rewards.streakXp = streak?.milestoneXp ?? 0;

  rewards.badges = await evaluateAchievements(userId);
  rewards.badgeXp = rewards.badges.reduce((s, b) => s + (b.xpBonus || 0), 0);
  return { rewards, streak: streak ? { current: streak.current, longest: streak.longest } : null };
}

/** Public shape of a judged result (hidden test details never included). */
export function verdictPayload(judged) {
  const { verdict, failed, submission } = judged;
  return {
    mode: executionMode(),
    executed: true,
    submissionId: String(submission._id),
    status: verdict.status,
    passed: verdict.passed,
    total: verdict.total,
    timeMs: verdict.timeMs,
    memoryKb: verdict.memoryKb,
    compileOutput: verdict.compileOutput || null,
    failed,
  };
}

/** Library "Submit". */
export async function submitSolution(user, { slug, language, code }) {
  await connectToDatabase();
  const problem = await getProblemWithTests(slug);
  if (!problem) throw new SubmissionError("Problem not found.", 404);
  const today = dayKey();
  const daily = await getChallengeFor(today);
  const isDaily = daily?.problem.id === String(problem._id);

  const judged = await judgeAndRecord(user, problem, { language, code, isDailyChallenge: isDaily });
  if (!judged.executed) {
    await logActivity(user.id, "submission.saved_demo", { entityType: "problem", entityId: problem._id });
    return {
      mode: "demo",
      executed: false,
      submissionId: String(judged.submission._id),
      status: "not_executed",
      message: "Demo mode: your code was saved but not executed, so it can't be judged and earns no XP. Set CODE_RUNNER=paiza (free) or Judge0 to run real submissions.",
    };
  }

  const accepted = judged.verdict.status === "accepted";
  const { rewards, streak } = await applyRewards(user, problem, judged.submission, { accepted, daily: isDaily ? daily : null });
  await logActivity(user.id, `submission.${judged.verdict.status}`, {
    entityType: "problem",
    entityId: problem._id,
    metadata: { language, passed: judged.verdict.passed, total: judged.verdict.total },
  });
  return { ...verdictPayload(judged), rewards, streak };
}

/** Your own submissions for one problem, newest first (includes your code). */
export async function listMySubmissions(userId, problemId, { contestId, limit = 20 } = {}) {
  await connectToDatabase();
  const filter = { userId: new ObjectId(userId), problemId: new ObjectId(String(problemId)) };
  if (contestId) filter.contestId = new ObjectId(String(contestId));
  const rows = await ProblemSubmission.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((s) => ({
    id: String(s._id),
    language: s.language,
    status: s.status,
    passedCount: s.passedCount,
    totalCount: s.totalCount,
    runtimeMs: s.runtimeMs,
    memoryKb: s.memoryKb,
    executionMode: s.executionMode,
    xpAwarded: s.xpAwarded,
    isSample: s.isSample,
    inContest: Boolean(s.contestId),
    code: s.code,
    createdAt: s.createdAt,
  }));
}
