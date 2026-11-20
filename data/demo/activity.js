import { XP_RULES, levelForXp, skillLevelFor } from "../../lib/utils/xp.js";
import { assessments } from "../assessments/index.js";
import { opportunities } from "../opportunities/index.js";
import { problems } from "../problems/index.js";
import { contests } from "./contests.js";
import { demoId } from "./ids.js";
import { demoStudents } from "./users.js";

/**
 * Deterministic sample activity for the demo students: submissions, streaks,
 * assessment attempts, applications and contest results. Dates are computed
 * relative to `now`, so demo mode (at request time) and the seed script
 * (at seed time) both produce fresh-looking history.
 *
 * Every record carries `isSample: true`; submissions have `executionMode:
 * "demo"` and no code, so nothing pretends to be a real judged run.
 */

// Small seeded PRNG (mulberry32) so the same student always gets the same history.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const LANGS = ["python", "java", "cpp", "javascript"];
const FAIL_STATUSES = ["wrong_answer", "wrong_answer", "time_limit_exceeded", "runtime_error", "compilation_error"];
const ACCEPT_CHANCE = { easy: 0.8, medium: 0.55, hard: 0.35 };
const APPLICATION_STATUSES = ["applied", "under_review", "shortlisted", "interview_scheduled", "rejected", "selected"];

const startOfDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

function streakFrom(activeDays, today) {
  // activeDays: Set of UTC day timestamps. Streak counts back from today (or yesterday).
  let cursor = today.getTime();
  if (!activeDays.has(cursor)) cursor -= DAY;
  let current = 0;
  while (activeDays.has(cursor)) {
    current += 1;
    cursor -= DAY;
  }
  const sorted = [...activeDays].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of sorted) {
    run = prev !== null && d - prev === DAY ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const last = sorted.length ? new Date(sorted[sorted.length - 1]) : null;
  return { current, longest: Math.max(longest, current), lastActivityDate: last };
}

export function buildDemoActivity(now = new Date()) {
  const today = startOfDay(now);
  const submissions = [];
  const attempts = [];
  const applications = [];
  const contestEntries = [];
  const savedOpportunities = [];
  const stats = [];
  let subN = 0;
  let attN = 0;
  let appN = 0;

  const pastContest = contests.find((c) => c.startsInHours < 0);

  demoStudents.forEach((student, si) => {
    const rand = rng(1000 + si * 7919);
    const activeDays = new Set();
    const solved = new Map(); // problemId -> difficulty
    let xp = 0;

    // Coding history over the last 45 days; recent days are more likely to be active.
    for (let back = 44; back >= 0; back -= 1) {
      const recentBoost = back < 21 ? 0.15 : 0;
      if (rand() > student.activity * 0.75 + recentBoost) continue;
      const day = today.getTime() - back * DAY;
      activeDays.add(day);
      const count = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < count; k += 1) {
        const problem = problems[Math.floor(rand() * problems.length)];
        const accepted = rand() < ACCEPT_CHANCE[problem.difficulty] * (0.6 + student.activity * 0.5);
        const total = problem.samples.length + problem.hiddenTests.length;
        const firstSolve = accepted && !solved.has(problem.id);
        if (firstSolve) {
          solved.set(problem.id, problem.difficulty);
          xp += problem.xpReward;
        }
        submissions.push({
          id: demoId("submission", ++subN),
          userId: student.id,
          problemId: problem.id,
          language: LANGS[Math.floor(rand() * LANGS.length)],
          status: accepted ? "accepted" : FAIL_STATUSES[Math.floor(rand() * FAIL_STATUSES.length)],
          passedCount: accepted ? total : Math.floor(rand() * total),
          totalCount: total,
          runtimeMs: accepted ? 20 + Math.floor(rand() * 180) : null,
          memoryKb: accepted ? 9000 + Math.floor(rand() * 9000) : null,
          executionMode: "demo",
          xpAwarded: firstSolve ? problem.xpReward : 0,
          createdAt: new Date(day + Math.floor(rand() * 14) * 3_600_000 + 8 * 3_600_000),
          isSample: true,
        });
      }
    }

    const streak = streakFrom(activeDays, today);
    for (const [days, bonus] of Object.entries(XP_RULES.streakMilestones)) {
      if (streak.longest >= Number(days)) xp += bonus;
    }

    // Assessment attempts.
    const attemptCount = 1 + Math.floor(rand() * 4);
    const picked = [...assessments].sort(() => rand() - 0.5).slice(0, attemptCount);
    for (const a of picked) {
      const correct = Math.min(a.questionCount, Math.round(a.questionCount * (0.35 + rand() * 0.35 + student.activity * 0.3)));
      const percentage = Math.round((correct / a.questionCount) * 100);
      const passed = percentage >= a.passPercentage;
      const award = (passed ? a.xpReward : 0) + (percentage >= 90 ? XP_RULES.assessmentMilestone90 : 0);
      xp += award;
      const submittedAt = new Date(today.getTime() - Math.floor(rand() * 30) * DAY + 15 * 3_600_000);
      attempts.push({
        id: demoId("attempt", ++attN),
        userId: student.id,
        assessmentId: a.id,
        status: "submitted",
        score: correct,
        total: a.questionCount,
        percentage,
        passed,
        xpAwarded: award,
        startedAt: new Date(submittedAt.getTime() - 8 * 60_000),
        submittedAt,
        isSample: true,
      });
    }

    // Past contest participation for the more active students.
    if (pastContest && student.activity >= 0.6) {
      const solvedCount = Math.min(pastContest.problems.length, Math.floor(student.activity * 4 + rand()));
      const score = pastContest.problems.slice(0, solvedCount).reduce((s, p) => s + p.points, 0);
      xp += XP_RULES.contestParticipation;
      contestEntries.push({
        contestId: pastContest.id,
        userId: student.id,
        score,
        solvedCount,
        penaltyMinutes: Math.floor(rand() * 4) * 10,
        isSample: true,
      });
    }

    // Applications and saved opportunities, matched loosely on skills.
    const mySkills = new Set(student.skills.map(([name]) => name));
    const matches = opportunities
      .map((o) => ({ o, overlap: o.requiredSkills.filter((s) => mySkills.has(s)).length }))
      .filter((m) => m.overlap > 0)
      .sort((x, y) => y.overlap - x.overlap);
    matches.slice(0, 3).forEach(({ o }, i) => {
      applications.push({
        id: demoId("application", ++appN),
        opportunityId: o.id,
        studentId: student.id,
        status: APPLICATION_STATUSES[(si + i) % APPLICATION_STATUSES.length],
        coverLetter: `Sample application from ${student.name}.`,
        appliedAt: new Date(today.getTime() - (i + 1) * 2 * DAY),
        isSample: true,
      });
    });
    matches.slice(3, 5).forEach(({ o }) => savedOpportunities.push({ userId: student.id, opportunityId: o.id, isSample: true }));

    xp += XP_RULES.profileComplete;
    const level = levelForXp(xp);
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    for (const d of solved.values()) byDifficulty[d] += 1;
    const mine = submissions.filter((s) => s.userId === student.id);

    stats.push({
      userId: student.id,
      xp,
      level,
      skillLevel: skillLevelFor(level),
      solvedCount: solved.size,
      solvedByDifficulty: byDifficulty,
      attemptedCount: new Set(mine.map((s) => s.problemId)).size,
      submissionCount: mine.length,
      accuracy: mine.length ? Math.round((mine.filter((s) => s.status === "accepted").length / mine.length) * 100) : 0,
      streak,
    });
  });

  // Rank the past contest by score, then penalty.
  contestEntries
    .sort((a, b) => b.score - a.score || a.penaltyMinutes - b.penaltyMinutes)
    .forEach((e, i) => {
      e.rank = i + 1;
    });

  return { submissions, attempts, applications, contestEntries, savedOpportunities, stats };
}
