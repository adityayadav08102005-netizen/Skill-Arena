import "server-only";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AssessmentAttempt, Contest, ContestParticipant, ContentReport, Problem, ProblemSubmission, Question } from "@/lib/db/models";
import { ASSESSMENT_CATEGORIES } from "@/data/assessments";
import { logActivity } from "./activity";
import { AdminError } from "./admin";
import { contestState } from "./contests";

const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CATEGORY_LABEL = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c.key, c.label]));

function validId(id, what) {
  if (!ObjectId.isValid(String(id))) throw new AdminError(`${what} not found.`, 404);
  return oid(id);
}

/** Cleared optional fields arrive as undefined; store null so the old value is actually removed. */
const withNulls = (data) => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === undefined ? null : v]));

const audit = (admin, action, entityType, entityId, title) => logActivity(admin.id, `admin.${action}`, { entityType, entityId, metadata: { title } });

function duplicateSlug(error, what) {
  if (error?.code === 11000) throw new AdminError(`Another ${what} already uses that slug.`, 409);
  throw error;
}

// ── Problems ──────────────────────────────────────────────────────
export async function listProblemsAdmin({ q = "", status = "" } = {}) {
  await connectToDatabase();
  const query = {};
  if (status === "published") query.isPublished = true;
  if (status === "draft") query.isPublished = false;
  if (q) query.$or = [{ title: { $regex: escapeRegex(q.slice(0, 80)), $options: "i" } }, { slug: { $regex: escapeRegex(q.slice(0, 80)), $options: "i" } }];
  const problems = await Problem.find(query, "slug title difficulty topics isPublished isInterview xpReward updatedAt").sort({ updatedAt: -1 }).lean();
  const ids = problems.map((p) => p._id);
  const [subs, inContests, reports] = await Promise.all([
    ProblemSubmission.aggregate([{ $match: { problemId: { $in: ids } } }, { $group: { _id: "$problemId", n: { $sum: 1 }, ok: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } } } }]),
    Contest.aggregate([{ $unwind: "$problems" }, { $match: { "problems.problemId": { $in: ids } } }, { $group: { _id: "$problems.problemId", n: { $sum: 1 } } }]),
    ContentReport.aggregate([{ $match: { entityType: "problem", status: "open" } }, { $group: { _id: "$entityId", n: { $sum: 1 } } }]),
  ]);
  const subMap = new Map(subs.map((s) => [String(s._id), s]));
  const contestMap = new Map(inContests.map((s) => [String(s._id), s.n]));
  const reportMap = new Map(reports.map((s) => [String(s._id), s.n]));
  return plain(
    problems.map((p) => {
      const s = subMap.get(String(p._id));
      return {
        id: String(p._id),
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        topics: p.topics ?? [],
        isPublished: p.isPublished,
        isInterview: p.isInterview,
        xpReward: p.xpReward,
        updatedAt: p.updatedAt,
        submissions: s?.n ?? 0,
        acceptance: s?.n ? Math.round((s.ok / s.n) * 100) : null,
        contests: contestMap.get(String(p._id)) ?? 0,
        openReports: reportMap.get(String(p._id)) ?? 0,
      };
    }),
  );
}

/** Full problem including hidden tests (admin only). */
export async function getProblemAdmin(id) {
  const _id = validId(id, "Problem");
  await connectToDatabase();
  const p = await Problem.findById(_id).select("+hiddenTests").lean();
  if (!p) throw new AdminError("Problem not found.", 404);
  return plain({ ...p, id: String(p._id) });
}

export async function createProblem(admin, data) {
  await connectToDatabase();
  let doc;
  try {
    doc = await Problem.create({ ...data, createdBy: oid(admin.id) });
  } catch (error) {
    duplicateSlug(error, "problem");
  }
  await audit(admin, "problem_create", "problem", doc._id, doc.title);
  return { id: String(doc._id), slug: doc.slug };
}

export async function updateProblem(admin, id, data) {
  const _id = validId(id, "Problem");
  await connectToDatabase();
  let doc;
  try {
    doc = await Problem.findOneAndUpdate({ _id }, { $set: withNulls(data) }, { returnDocument: "after", runValidators: true }).lean();
  } catch (error) {
    duplicateSlug(error, "problem");
  }
  if (!doc) throw new AdminError("Problem not found.", 404);
  await audit(admin, "problem_update", "problem", _id, doc.title);
  return { id: String(doc._id), slug: doc.slug, isPublished: doc.isPublished };
}

export async function setProblemPublished(admin, id, isPublished) {
  const _id = validId(id, "Problem");
  await connectToDatabase();
  const doc = await Problem.findOneAndUpdate({ _id }, { $set: { isPublished } }, { returnDocument: "after" }).lean();
  if (!doc) throw new AdminError("Problem not found.", 404);
  await audit(admin, "problem_update", "problem", _id, doc.title);
  return { isPublished: doc.isPublished };
}

/** Only problems nobody has submitted to and no contest uses; otherwise unpublish them. */
export async function deleteProblem(admin, id) {
  const _id = validId(id, "Problem");
  await connectToDatabase();
  const [used, inContest] = await Promise.all([ProblemSubmission.exists({ problemId: _id }), Contest.exists({ "problems.problemId": _id })]);
  if (used || inContest) throw new AdminError(`This problem ${used ? "has submissions" : "is part of a contest"}. Unpublish it instead so history stays intact.`, 409);
  const doc = await Problem.findOneAndDelete({ _id }).lean();
  if (!doc) throw new AdminError("Problem not found.", 404);
  await audit(admin, "problem_delete", "problem", _id, doc.title);
  return { deleted: true };
}

// ── Question bank ─────────────────────────────────────────────────
export function parseQuestionFilters(params = {}) {
  const keys = ASSESSMENT_CATEGORIES.map((c) => c.key);
  return {
    category: keys.includes(params.category) ? params.category : "",
    difficulty: ["easy", "medium", "hard"].includes(params.difficulty) ? params.difficulty : "",
    status: ["active", "inactive"].includes(params.status) ? params.status : "",
    q: String(params.q ?? "").trim().slice(0, 80),
    page: Math.max(0, Number.parseInt(params.page, 10) || 0),
  };
}

export async function listQuestionsAdmin({ category, difficulty, status, q, page, id }) {
  await connectToDatabase();
  const query = {};
  if (id && ObjectId.isValid(id)) query._id = oid(id);
  if (category) query.category = category;
  if (difficulty) query.difficulty = difficulty;
  if (status) query.isActive = status === "active";
  if (q) query.$or = [{ prompt: { $regex: escapeRegex(q), $options: "i" } }, { topic: { $regex: escapeRegex(q), $options: "i" } }];
  const size = 30;
  const [items, total, coverage, reports] = await Promise.all([
    Question.find(query).select("+answer +explanation").sort({ updatedAt: -1 }).skip(page * size).limit(size).lean(),
    Question.countDocuments(query),
    Question.aggregate([{ $match: { isActive: true } }, { $group: { _id: { c: "$category", d: "$difficulty" }, n: { $sum: 1 } } }]),
    ContentReport.aggregate([{ $match: { entityType: "question", status: "open" } }, { $group: { _id: "$entityId", n: { $sum: 1 } } }]),
  ]);
  const reportMap = new Map(reports.map((r) => [String(r._id), r.n]));
  const byCategory = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c.key, { label: c.label, easy: 0, medium: 0, hard: 0 }]));
  for (const { _id, n } of coverage) if (byCategory[_id.c]) byCategory[_id.c][_id.d] = n;
  return plain({
    total,
    hasMore: (page + 1) * size < total,
    coverage: byCategory,
    items: items.map((x) => ({
      id: String(x._id),
      category: x.category,
      categoryLabel: CATEGORY_LABEL[x.category] ?? x.category,
      topic: x.topic ?? "",
      difficulty: x.difficulty,
      prompt: x.prompt,
      options: x.options,
      answer: x.answer,
      explanation: x.explanation ?? "",
      isActive: x.isActive,
      openReports: reportMap.get(String(x._id)) ?? 0,
    })),
  });
}

export async function createQuestion(admin, data) {
  await connectToDatabase();
  const doc = await Question.create({ ...data, createdBy: oid(admin.id) });
  await audit(admin, "question_create", "question", doc._id, data.prompt.slice(0, 80));
  return { id: String(doc._id) };
}

export async function updateQuestion(admin, id, data) {
  const _id = validId(id, "Question");
  await connectToDatabase();
  const doc = await Question.findOneAndUpdate({ _id }, { $set: withNulls(data) }, { returnDocument: "after", runValidators: true }).lean();
  if (!doc) throw new AdminError("Question not found.", 404);
  await audit(admin, "question_update", "question", _id, doc.prompt.slice(0, 80));
  return { id: String(doc._id) };
}

/** Questions used in any attempt are kept for the review screens; deactivate those instead. */
export async function deleteQuestion(admin, id) {
  const _id = validId(id, "Question");
  await connectToDatabase();
  if (await AssessmentAttempt.exists({ questionIds: _id })) throw new AdminError("Students have answered this question, so it stays for their reviews. Deactivate it instead.", 409);
  const doc = await Question.findOneAndDelete({ _id }).lean();
  if (!doc) throw new AdminError("Question not found.", 404);
  await audit(admin, "question_delete", "question", _id, doc.prompt.slice(0, 80));
  return { deleted: true };
}

// ── Contests ──────────────────────────────────────────────────────
export async function listContestsAdmin() {
  await connectToDatabase();
  const contests = await Contest.find({}).sort({ startsAt: -1 }).lean();
  const counts = await ContestParticipant.aggregate([{ $group: { _id: "$contestId", n: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const now = new Date();
  return plain(
    contests.map((c) => ({
      id: String(c._id),
      slug: c.slug,
      title: c.title,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      state: contestState(c, now),
      isPublished: c.isPublished,
      finalized: Boolean(c.finalizedAt),
      problems: c.problems.length,
      participants: countMap.get(String(c._id)) ?? 0,
    })),
  );
}

export async function getContestAdmin(id) {
  const _id = validId(id, "Contest");
  await connectToDatabase();
  const c = await Contest.findById(_id).lean();
  if (!c) throw new AdminError("Contest not found.", 404);
  const participants = await ContestParticipant.countDocuments({ contestId: _id });
  return plain({
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    description: c.description ?? "",
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    penaltyMinutesPerWrong: c.penaltyMinutesPerWrong,
    problems: [...c.problems].sort((a, b) => a.position - b.position).map((p) => ({ problemId: String(p.problemId), points: p.points })),
    isPublished: c.isPublished,
    state: contestState(c),
    participants,
  });
}

/** Problems an admin can put in a contest (drafts included: they stay hidden until the contest starts). */
export async function contestProblemOptions() {
  await connectToDatabase();
  const problems = await Problem.find({}, "title slug difficulty isPublished").sort({ difficulty: 1, title: 1 }).lean();
  return plain(problems.map((p) => ({ id: String(p._id), title: p.title, slug: p.slug, difficulty: p.difficulty, isPublished: p.isPublished })));
}

async function checkProblems(problems) {
  const found = await Problem.countDocuments({ _id: { $in: problems.map((p) => oid(p.problemId)) } });
  if (found !== problems.length) throw new AdminError("One of the chosen problems no longer exists.", 422);
  return problems.map((p, position) => ({ problemId: oid(p.problemId), points: p.points, position }));
}

export async function createContest(admin, data) {
  if (data.startsAt <= new Date()) throw new AdminError("Pick a start time in the future.", 422);
  await connectToDatabase();
  const problems = await checkProblems(data.problems);
  let doc;
  try {
    doc = await Contest.create({ ...data, problems, createdBy: oid(admin.id) });
  } catch (error) {
    duplicateSlug(error, "contest");
  }
  await audit(admin, "contest_create", "contest", doc._id, doc.title);
  return { id: String(doc._id), slug: doc.slug };
}

/**
 * Before a contest starts everything can change. Once it's live or over, the
 * schedule, problems and scoring are locked so standings stay fair; only the
 * title, description and (while live) a later end time can change.
 */
export async function updateContest(admin, id, data) {
  const _id = validId(id, "Contest");
  await connectToDatabase();
  const contest = await Contest.findById(_id).lean();
  if (!contest) throw new AdminError("Contest not found.", 404);
  const state = contestState(contest);
  // The form works in whole minutes, so compare times at minute precision.
  const sameMinute = (a, b) => Math.floor(+a / 60_000) === Math.floor(+b / 60_000);
  let update;
  if (state === "upcoming") {
    if (data.startsAt <= new Date()) throw new AdminError("Pick a start time in the future.", 422);
    update = withNulls({ ...data, problems: await checkProblems(data.problems) });
  } else {
    const sameProblems =
      data.problems.length === contest.problems.length &&
      data.problems.every((p, i) => {
        const current = [...contest.problems].sort((a, b) => a.position - b.position)[i];
        return String(current.problemId) === p.problemId && current.points === p.points;
      });
    if (!sameProblems || !sameMinute(data.startsAt, contest.startsAt) || data.penaltyMinutesPerWrong !== contest.penaltyMinutesPerWrong || data.slug !== contest.slug) {
      throw new AdminError(`This contest has ${state === "live" ? "started" : "ended"}: its schedule, problems and scoring are locked.`, 409);
    }
    if (!data.isPublished) throw new AdminError("A contest that has started can't be unpublished.", 409);
    update = { title: data.title, description: data.description ?? null };
    if (!sameMinute(data.endsAt, contest.endsAt)) {
      if (state === "ended") throw new AdminError("This contest has ended: its schedule is locked.", 409);
      if (data.endsAt < contest.endsAt) throw new AdminError("A live contest can only be extended, not shortened.", 409);
      update.endsAt = data.endsAt;
    }
  }
  try {
    await Contest.updateOne({ _id }, { $set: update }, { runValidators: true });
  } catch (error) {
    duplicateSlug(error, "contest");
  }
  await audit(admin, "contest_update", "contest", _id, data.title);
  return { id: String(_id) };
}

export async function deleteContest(admin, id) {
  const _id = validId(id, "Contest");
  await connectToDatabase();
  const contest = await Contest.findById(_id).lean();
  if (!contest) throw new AdminError("Contest not found.", 404);
  if (contestState(contest) !== "upcoming") throw new AdminError("Only contests that haven't started can be deleted.", 409);
  if (await ContestParticipant.exists({ contestId: _id })) throw new AdminError("Students have registered for this contest. Unpublish it instead.", 409);
  await Contest.deleteOne({ _id });
  await audit(admin, "contest_delete", "contest", _id, contest.title);
  return { deleted: true };
}
