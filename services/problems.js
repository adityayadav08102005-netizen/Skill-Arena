import "server-only";
import { ObjectId } from "mongodb";
import { buildDemoActivity } from "@/data/demo/activity";
import { problems as demoProblems, problemBySlug as demoBySlug } from "@/data/problems";
import { starterCode } from "@/data/problems/starterCode";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Problem, ProblemSubmission } from "@/lib/db/models";
import { LANGUAGE_KEYS } from "@/lib/execution/languages";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

const PUBLIC_FIELDS = "slug title description difficulty topics concepts isInterview inputFormat outputFormat constraints samples hints timeComplexity spaceComplexity xpReward";
const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

function summary(p) {
  return {
    id: String(p._id ?? p.id),
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    topics: p.topics ?? [],
    concepts: p.concepts ?? [],
    isInterview: Boolean(p.isInterview),
    xpReward: p.xpReward,
  };
}

/**
 * Problem library with acceptance rates and, for a signed-in viewer, their
 * status per problem (solved / attempted / todo). Demo mode uses the bundled
 * catalogue and sample activity.
 */
export async function listLibrary(viewerId) {
  if (!isDatabaseConfigured()) {
    const activity = buildDemoActivity();
    const stats = new Map();
    for (const s of activity.submissions) {
      const row = stats.get(s.problemId) ?? { total: 0, accepted: 0 };
      row.total += 1;
      if (s.status === "accepted") row.accepted += 1;
      stats.set(s.problemId, row);
    }
    return {
      mode: "demo",
      problems: demoProblems.map((p) => {
        const st = stats.get(p.id);
        return { ...summary(p), acceptance: st ? Math.round((st.accepted / st.total) * 100) : null, submissions: st?.total ?? 0, status: "todo" };
      }),
    };
  }

  await connectToDatabase();
  const [docs, rates, solved, attempted] = await Promise.all([
    Problem.find({ isPublished: true }, "slug title difficulty topics concepts isInterview xpReward").lean(),
    ProblemSubmission.aggregate([
      { $match: { status: { $ne: "not_executed" } } },
      { $group: { _id: "$problemId", total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } } } },
    ]),
    viewerId ? ProblemSubmission.distinct("problemId", { userId: new ObjectId(viewerId), status: "accepted" }) : [],
    viewerId ? ProblemSubmission.distinct("problemId", { userId: new ObjectId(viewerId) }) : [],
  ]);
  const rateById = new Map(rates.map((r) => [String(r._id), r]));
  const solvedSet = new Set(solved.map(String));
  const attemptedSet = new Set(attempted.map(String));

  return {
    mode: "database",
    problems: docs
      .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || a.title.localeCompare(b.title))
      .map((p) => {
        const id = String(p._id);
        const r = rateById.get(id);
        return {
          ...summary(p),
          acceptance: r?.total ? Math.round((r.accepted / r.total) * 100) : null,
          submissions: r?.total ?? 0,
          status: solvedSet.has(id) ? "solved" : attemptedSet.has(id) ? "attempted" : "todo",
        };
      }),
  };
}

/** Public problem data for the workspace (never includes hidden tests) plus starter code. */
export async function getProblemForWorkspace(slug, { allowUnpublished = false } = {}) {
  let problem;
  if (!isDatabaseConfigured()) {
    problem = demoBySlug[slug] ?? null;
  } else {
    await connectToDatabase();
    problem = await Problem.findOne({ slug, ...(allowUnpublished ? {} : { isPublished: true }) }, PUBLIC_FIELDS).lean();
  }
  if (!problem) return null;
  const { hiddenTests: _hidden, ...publicProblem } = problem; // demo objects carry hidden tests; drop them
  return JSON.parse(
    JSON.stringify({
      ...publicProblem,
      id: String(problem._id ?? problem.id),
      _id: undefined,
      starter: Object.fromEntries(LANGUAGE_KEYS.map((lang) => [lang, starterCode(problem, lang)])),
    }),
  );
}

/**
 * Problem with hidden tests, for judging on the server only.
 * `allowUnpublished` is for contest-only problems, which stay out of the library.
 */
export async function getProblemWithTests(slug, { allowUnpublished = false } = {}) {
  if (!isDatabaseConfigured()) {
    const p = demoBySlug[slug];
    return p ? { ...p, _id: p.id } : null;
  }
  await connectToDatabase();
  return Problem.findOne({ slug, ...(allowUnpublished ? {} : { isPublished: true }) }).select("+hiddenTests").lean();
}
