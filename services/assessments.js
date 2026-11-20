import "server-only";
import { ObjectId } from "mongodb";
import { ASSESSMENT_CATEGORIES, assessments as demoAssessments, questions as demoQuestions } from "@/data/assessments";
import { CATEGORY_SKILLS, VERIFY_THRESHOLD, proficiencyFor, scoreAttempt, shuffle, skillProficiencyFromScore } from "@/lib/assessments/scoring";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Assessment, AssessmentAttempt, Profile, Question, Skill } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { XP_RULES } from "@/lib/utils/xp";
import { evaluateAchievements } from "./achievements";
import { logActivity, notify } from "./activity";
import { awardXp } from "./gamification";

export class AssessmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const DIFFICULTIES = ["mixed", "easy", "medium", "hard"];
const MIN_FOR_DIFFICULTY = 3; // a single-difficulty test needs at least this many questions
const GRACE_MS = 5_000; // network slack after the timer hits zero
const CATEGORY_LABEL = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c.key, c.label]));
const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));

/** How many questions a test at this difficulty will have, and how long it lasts. */
function plan(assessment, available) {
  const count = Math.min(assessment.questionCount, available);
  const minutes = Math.max(2, Math.ceil((assessment.durationMinutes * count) / assessment.questionCount));
  return { count, minutes };
}

function difficultyOptions(assessment, counts) {
  return DIFFICULTIES.map((d) => {
    const available = d === "mixed" ? Object.values(counts).reduce((s, n) => s + n, 0) : counts[d] ?? 0;
    const p = plan(assessment, available);
    const ok = d === "mixed" ? available >= 1 : available >= MIN_FOR_DIFFICULTY;
    return { key: d, available, questions: p.count, minutes: p.minutes, enabled: ok };
  });
}

/** Assessment center listing with question availability and the viewer's results. */
export async function listAssessments(viewerId) {
  if (!isDatabaseConfigured()) {
    return plain({
      mode: "demo",
      items: demoAssessments.map((a) => {
        const counts = {};
        for (const q of demoQuestions.filter((x) => x.category === a.category)) counts[q.difficulty] = (counts[q.difficulty] ?? 0) + 1;
        return { ...a, categoryLabel: CATEGORY_LABEL[a.category], options: difficultyOptions(a, counts), best: null, attempts: 0, inProgressId: null };
      }),
    });
  }
  await connectToDatabase();
  const [items, counts, mine] = await Promise.all([
    Assessment.find({ isPublished: true }).sort({ title: 1 }).lean(),
    Question.aggregate([{ $match: { isActive: true } }, { $group: { _id: { c: "$category", d: "$difficulty" }, n: { $sum: 1 } } }]),
    viewerId ? AssessmentAttempt.find({ userId: oid(viewerId) }, { assessmentId: 1, status: 1, percentage: 1, expiresAt: 1 }).lean() : [],
  ]);
  const byCategory = {};
  for (const c of counts) (byCategory[c._id.c] ??= {})[c._id.d] = c.n;
  const now = Date.now();
  return plain({
    mode: "database",
    items: items.map((a) => {
      const own = mine.filter((m) => String(m.assessmentId) === String(a._id));
      const done = own.filter((m) => m.status !== "in_progress");
      const live = own.find((m) => m.status === "in_progress" && new Date(m.expiresAt).getTime() + GRACE_MS > now);
      return {
        id: String(a._id),
        slug: a.slug,
        title: a.title,
        category: a.category,
        categoryLabel: CATEGORY_LABEL[a.category] ?? a.category,
        description: a.description,
        durationMinutes: a.durationMinutes,
        questionCount: a.questionCount,
        passPercentage: a.passPercentage,
        xpReward: a.xpReward,
        options: difficultyOptions(a, byCategory[a.category] ?? {}),
        best: done.length ? Math.max(...done.map((d) => d.percentage)) : null,
        attempts: done.length,
        inProgressId: live ? String(live._id) : null,
      };
    }),
  });
}

/**
 * Starts (or resumes) an attempt. Questions are drawn at random from the
 * active bank for the category and difficulty; only their ids are stored.
 */
export async function startAttempt(user, slug, difficulty) {
  if (!DIFFICULTIES.includes(difficulty)) throw new AssessmentError("Choose a difficulty.", 422);
  await connectToDatabase();
  const assessment = await Assessment.findOne({ slug, isPublished: true }).lean();
  if (!assessment) throw new AssessmentError("Assessment not found.", 404);
  const uid = oid(user.id);

  const existing = await AssessmentAttempt.findOne({ userId: uid, assessmentId: assessment._id, status: "in_progress" }).sort({ createdAt: -1 }).lean();
  if (existing) {
    if (new Date(existing.expiresAt).getTime() + GRACE_MS > Date.now()) return { attemptId: String(existing._id), resumed: true };
    await submitAttempt(user, existing._id); // time ran out while away: score what was saved
  }

  const filter = { category: assessment.category, isActive: true, ...(difficulty === "mixed" ? {} : { difficulty }) };
  const pool = await Question.find(filter, { _id: 1 }).lean();
  if (difficulty !== "mixed" && pool.length < MIN_FOR_DIFFICULTY) throw new AssessmentError("Not enough questions at this difficulty yet. Try mixed.", 409);
  if (!pool.length) throw new AssessmentError("This assessment has no questions yet.", 409);
  const { count, minutes } = plan(assessment, pool.length);
  const picked = shuffle(pool).slice(0, count).map((q) => q._id);
  const now = new Date();
  const attempt = await AssessmentAttempt.create({
    userId: uid,
    assessmentId: assessment._id,
    questionIds: picked,
    answers: picked.map(() => null),
    difficulty,
    startedAt: now,
    expiresAt: new Date(now.getTime() + minutes * 60_000),
    total: picked.length,
  });
  await logActivity(user.id, "assessment.started", { entityType: "assessment", entityId: assessment._id, metadata: { difficulty } });
  return { attemptId: String(attempt._id), resumed: false };
}

async function ownAttempt(user, attemptId) {
  if (!ObjectId.isValid(attemptId)) throw new AssessmentError("Attempt not found.", 404);
  await connectToDatabase();
  const attempt = await AssessmentAttempt.findOne({ _id: oid(attemptId), userId: oid(user.id) }).lean();
  if (!attempt) throw new AssessmentError("Attempt not found.", 404);
  return attempt;
}

/** Questions for an in-progress attempt — never including the answers. */
export async function getAttemptForTaking(user, attemptId) {
  let attempt = await ownAttempt(user, attemptId);
  if (attempt.status === "in_progress" && new Date(attempt.expiresAt).getTime() + GRACE_MS <= Date.now()) {
    await submitAttempt(user, attempt._id);
    attempt = await ownAttempt(user, attemptId);
  }
  const assessment = await Assessment.findById(attempt.assessmentId, { title: 1, slug: 1, category: 1, passPercentage: 1 }).lean();
  if (attempt.status !== "in_progress") return plain({ finished: true, attemptId: String(attempt._id), slug: assessment?.slug });

  const docs = await Question.find({ _id: { $in: attempt.questionIds } }, { prompt: 1, options: 1, topic: 1, difficulty: 1 }).lean(); // answer is select:false anyway
  const byId = new Map(docs.map((q) => [String(q._id), q]));
  return plain({
    finished: false,
    attemptId: String(attempt._id),
    title: assessment?.title,
    slug: assessment?.slug,
    passPercentage: assessment?.passPercentage,
    difficulty: attempt.difficulty,
    expiresAt: attempt.expiresAt,
    serverNow: new Date(),
    answers: attempt.answers,
    flagged: attempt.flagged ?? [],
    questions: attempt.questionIds.map((id) => {
      const q = byId.get(String(id));
      return q ? { id: String(q._id), prompt: q.prompt, options: q.options, topic: q.topic, difficulty: q.difficulty } : { id: String(id), prompt: "This question was removed.", options: [], topic: "", difficulty: "" };
    }),
  });
}

/** Autosave answers and flags. Only before the timer ends (plus a few seconds of slack). */
export async function saveAnswers(user, attemptId, { answers, flagged }) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status !== "in_progress") throw new AssessmentError("This attempt is already submitted.", 409);
  if (new Date(attempt.expiresAt).getTime() + GRACE_MS < Date.now()) throw new AssessmentError("Time is up. Your saved answers will be scored.", 409);
  if (answers.length !== attempt.questionIds.length) throw new AssessmentError("Answers don't match the questions.", 422);
  const docs = await Question.find({ _id: { $in: attempt.questionIds } }, { options: 1 }).lean();
  const optionCount = new Map(docs.map((q) => [String(q._id), q.options.length]));
  attempt.questionIds.forEach((id, i) => {
    const a = answers[i];
    if (a !== null && (a < 0 || a >= (optionCount.get(String(id)) ?? 0))) throw new AssessmentError("An answer points at an option that doesn't exist.", 422);
  });
  const cleanFlags = [...new Set((flagged ?? []).filter((f) => f >= 0 && f < attempt.questionIds.length))];
  await AssessmentAttempt.updateOne({ _id: attempt._id, status: "in_progress" }, { $set: { answers, flagged: cleanFlags } });
  return { saved: true, answered: answers.filter((a) => a !== null).length };
}

/** Marks the matching profile skills as verified after a strong score. */
async function verifySkills(userId, category, percentage) {
  const names = CATEGORY_SKILLS[category] ?? [];
  if (!names.length || percentage < VERIFY_THRESHOLD) return [];
  const profile = await Profile.findOne({ userId: oid(userId) }, { skills: 1 }).lean();
  if (!profile) return [];
  const skills = [...(profile.skills ?? [])];
  const level = skillProficiencyFromScore(percentage);
  const verified = [];
  for (const name of names) {
    const i = skills.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
    if (i >= 0) {
      skills[i] = { ...skills[i], verified: true, source: "assessment", proficiency: Math.max(skills[i].proficiency ?? 1, level) };
    } else if (skills.length < 40) {
      const skill = await Skill.findOneAndUpdate({ name }, { $setOnInsert: { name, category: "technical" } }, { upsert: true, returnDocument: "after", collation: { locale: "en", strength: 2 } }).lean();
      skills.push({ skillId: skill._id, name: skill.name, proficiency: level, verified: true, source: "assessment" });
    }
    verified.push(name);
  }
  await Profile.updateOne({ userId: oid(userId) }, { $set: { skills } });
  return verified;
}

/**
 * Scores the attempt on the server (idempotent: a second submit returns the
 * stored result). Grants XP for passing and the 90% milestone once per
 * assessment through the ledger, verifies skills, sends a notification and
 * checks badges.
 */
export async function submitAttempt(user, attemptId) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status !== "in_progress") return { attemptId: String(attempt._id), alreadySubmitted: true };

  const now = new Date();
  const late = new Date(attempt.expiresAt).getTime() + GRACE_MS < now.getTime();
  const claimed = await AssessmentAttempt.findOneAndUpdate(
    { _id: attempt._id, status: "in_progress" },
    { $set: { status: late ? "expired" : "submitted", submittedAt: late ? attempt.expiresAt : now } },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) return { attemptId: String(attempt._id), alreadySubmitted: true };

  const [assessment, docs] = await Promise.all([
    Assessment.findById(attempt.assessmentId).lean(),
    Question.find({ _id: { $in: attempt.questionIds } }).select("+answer").lean(),
  ]);
  const byId = new Map(docs.map((q) => [String(q._id), q]));
  const ordered = attempt.questionIds.map((id) => {
    const q = byId.get(String(id));
    return { id: String(id), topic: q?.topic, answer: q?.answer ?? -1 };
  });
  const result = scoreAttempt(ordered, claimed.answers);
  const passed = result.percentage >= (assessment?.passPercentage ?? 60);

  let xpAwarded = 0;
  if (passed) {
    const pass = await awardXp(user.id, { amount: assessment.xpReward || XP_RULES.assessmentPassed, reason: "assessment_passed", refId: String(assessment._id) });
    if (pass.awarded) xpAwarded += assessment.xpReward || XP_RULES.assessmentPassed;
  }
  if (result.percentage >= 90) {
    const milestone = await awardXp(user.id, { amount: XP_RULES.assessmentMilestone90, reason: "assessment_milestone", refId: `${assessment._id}-90` });
    if (milestone.awarded) xpAwarded += XP_RULES.assessmentMilestone90;
  }

  await AssessmentAttempt.updateOne(
    { _id: attempt._id },
    { $set: { score: result.score, total: result.total, percentage: result.percentage, passed, topicScores: result.topicScores, xpAwarded } },
  );
  const verified = await verifySkills(user.id, assessment.category, result.percentage);
  await logActivity(user.id, "assessment.submitted", { entityType: "assessment", entityId: assessment._id, metadata: { percentage: result.percentage, passed } });
  await notify(user.id, {
    type: "assessment_result",
    title: `${assessment.title}: ${result.percentage}%`,
    body: `${passed ? "Passed" : "Not passed yet"} · ${result.score} of ${result.total} correct${xpAwarded ? ` · +${xpAwarded} XP` : ""}${verified.length ? ` · ${verified.join(", ")} verified` : ""}`,
    link: `/assessments/attempt/${attempt._id}`,
  });
  const badges = await evaluateAchievements(user.id);
  return { attemptId: String(attempt._id), percentage: result.percentage, passed, xpAwarded, verified, badges };
}

/** Results and full review (answers, explanations) — only after submitting. */
export async function getAttemptReview(user, attemptId) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status === "in_progress") return null;
  const [assessment, docs, previous] = await Promise.all([
    Assessment.findById(attempt.assessmentId).lean(),
    Question.find({ _id: { $in: attempt.questionIds } }).select("+answer +explanation").lean(),
    AssessmentAttempt.find({ userId: attempt.userId, assessmentId: attempt.assessmentId, status: { $ne: "in_progress" }, _id: { $ne: attempt._id }, submittedAt: { $lt: attempt.submittedAt } }, { percentage: 1 }).lean(),
  ]);
  const byId = new Map(docs.map((q) => [String(q._id), q]));
  const topicScores = attempt.topicScores instanceof Map ? Object.fromEntries(attempt.topicScores) : attempt.topicScores ?? {};
  return plain({
    attemptId: String(attempt._id),
    title: assessment?.title,
    slug: assessment?.slug,
    category: assessment?.category,
    passPercentage: assessment?.passPercentage,
    difficulty: attempt.difficulty,
    status: attempt.status,
    score: attempt.score,
    total: attempt.total,
    percentage: attempt.percentage,
    passed: attempt.passed,
    xpAwarded: attempt.xpAwarded,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    durationSeconds: attempt.submittedAt ? Math.round((new Date(attempt.submittedAt) - new Date(attempt.startedAt)) / 1000) : null,
    previousBest: previous.length ? Math.max(...previous.map((p) => p.percentage)) : null,
    proficiency: proficiencyFor(attempt.percentage),
    verifiable: CATEGORY_SKILLS[assessment?.category] ?? [],
    verifyThreshold: VERIFY_THRESHOLD,
    isSample: Boolean(attempt.isSample),
    topics: Object.entries(topicScores).map(([topic, s]) => ({ topic, ...s, percent: Math.round((s.correct / s.total) * 100) })),
    questions: attempt.questionIds.map((id, i) => {
      const q = byId.get(String(id));
      const chosen = attempt.answers?.[i] ?? null;
      return {
        id: String(id),
        prompt: q?.prompt ?? "This question was removed.",
        options: q?.options ?? [],
        topic: q?.topic,
        answer: q?.answer ?? null,
        explanation: q?.explanation ?? "",
        chosen,
        correct: chosen !== null && chosen === q?.answer,
      };
    }),
  });
}

/** Performance analysis across every submitted attempt. */
export async function getPerformance(userId) {
  await connectToDatabase();
  const attempts = await AssessmentAttempt.find({ userId: oid(userId), status: { $ne: "in_progress" } })
    .sort({ submittedAt: 1 })
    .populate("assessmentId", "title slug category")
    .lean();
  const best = new Map();
  const topics = new Map();
  for (const a of attempts) {
    const cat = a.assessmentId?.category;
    if (cat && (!best.has(cat) || best.get(cat).percentage < a.percentage)) best.set(cat, { percentage: a.percentage, attemptId: String(a._id), date: a.submittedAt });
    const ts = a.topicScores instanceof Map ? Object.fromEntries(a.topicScores) : a.topicScores ?? {};
    for (const [topic, s] of Object.entries(ts)) {
      const key = `${CATEGORY_LABEL[cat] ?? cat} · ${topic}`;
      const t = topics.get(key) ?? { topic: key, correct: 0, total: 0 };
      t.correct += s.correct;
      t.total += s.total;
      topics.set(key, t);
    }
  }
  const topicList = [...topics.values()].filter((t) => t.total >= 1).map((t) => ({ ...t, percent: Math.round((t.correct / t.total) * 100) }));
  return plain({
    taken: attempts.length,
    passed: attempts.filter((a) => a.passed).length,
    average: attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : null,
    trend: attempts.map((a) => ({ id: String(a._id), date: a.submittedAt, percentage: a.percentage, title: a.assessmentId?.title ?? "Assessment", passed: a.passed })),
    proficiency: ASSESSMENT_CATEGORIES.map((c) => {
      const b = best.get(c.key);
      return { category: c.key, label: c.label, best: b?.percentage ?? null, attemptId: b?.attemptId ?? null, ...(b ? proficiencyFor(b.percentage) : { level: null, rank: 0 }) };
    }),
    strengths: [...topicList].sort((a, b) => b.percent - a.percent || b.total - a.total).slice(0, 3),
    focusAreas: [...topicList].filter((t) => t.percent < 100).sort((a, b) => a.percent - b.percent || b.total - a.total).slice(0, 3),
    history: [...attempts].reverse().slice(0, 20).map((a) => ({
      id: String(a._id),
      title: a.assessmentId?.title ?? "Assessment",
      percentage: a.percentage,
      score: a.score,
      total: a.total,
      passed: a.passed,
      difficulty: a.difficulty,
      date: a.submittedAt,
      xpAwarded: a.xpAwarded,
      isSample: Boolean(a.isSample),
    })),
  });
}
