import "server-only";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { ASSESSMENT_CATEGORIES } from "@/data/assessments";
import { proficiencyFor } from "@/lib/assessments/scoring";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AssessmentAttempt, ContestParticipant, Problem, ProblemSubmission, Profile, UserAchievement } from "@/lib/db/models";

const CATEGORY_LABEL = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c.key, c.label]));
const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));
const FINISHED = { $in: ["submitted", "expired"] };

/**
 * Builds candidate summaries for many students at once (one query per kind,
 * not per student). `respectPrivacy` hides sections the student turned off —
 * used for search; applicants share their full profile with the listing's recruiter.
 */
export async function candidateSummaries(studentIds, { respectPrivacy = false } = {}) {
  const ids = [...new Set(studentIds.map(String))].filter((id) => ObjectId.isValid(id)).map(oid);
  if (!ids.length) return new Map();
  await connectToDatabase();
  const [profiles, users, solvedRows, totals, attempts, contests, badges, problems] = await Promise.all([
    Profile.find({ userId: { $in: ids } }).lean(),
    mongoose.connection.collection("user").find({ _id: { $in: ids } }, { projection: { image: 1 } }).toArray(),
    ProblemSubmission.aggregate([{ $match: { userId: { $in: ids }, status: "accepted" } }, { $group: { _id: { u: "$userId", p: "$problemId" } } }]),
    ProblemSubmission.aggregate([
      { $match: { userId: { $in: ids }, status: { $ne: "not_executed" } } },
      { $group: { _id: "$userId", total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } } } },
    ]),
    AssessmentAttempt.find({ userId: { $in: ids }, status: FINISHED }, { userId: 1, percentage: 1, assessmentId: 1 }).populate("assessmentId", "category").lean(),
    ContestParticipant.find({ userId: { $in: ids }, $or: [{ submissions: { $gt: 0 } }, { solvedCount: { $gt: 0 } }] }, { userId: 1, rank: 1, score: 1 }).lean(),
    UserAchievement.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: "$userId", n: { $sum: 1 } } }]),
    Problem.find({}, { difficulty: 1 }).lean(),
  ]);

  const diffOf = new Map(problems.map((p) => [String(p._id), p.difficulty]));
  const imageOf = new Map(users.map((u) => [String(u._id), u.image ?? null]));
  const totalOf = new Map(totals.map((t) => [String(t._id), t]));
  const badgeOf = new Map(badges.map((b) => [String(b._id), b.n]));
  const solved = new Map();
  for (const r of solvedRows) {
    const key = String(r._id.u);
    const s = solved.get(key) ?? { easy: 0, medium: 0, hard: 0 };
    const d = diffOf.get(String(r._id.p));
    if (d) s[d] += 1;
    solved.set(key, s);
  }
  const bestBy = new Map();
  for (const a of attempts) {
    const key = String(a.userId);
    const cat = a.assessmentId?.category;
    if (!cat) continue;
    const m = bestBy.get(key) ?? {};
    m[cat] = Math.max(m[cat] ?? 0, a.percentage);
    bestBy.set(key, m);
  }

  const map = new Map();
  for (const p of profiles) {
    const id = String(p.userId);
    const v = p.visibility ?? {};
    const show = (key) => !respectPrivacy || v[key] !== false;
    const s = solved.get(id) ?? { easy: 0, medium: 0, hard: 0 };
    const t = totalOf.get(id);
    const best = bestBy.get(id) ?? {};
    const myContests = contests.filter((c) => String(c.userId) === id);
    map.set(id, {
      userId: id,
      fullName: p.fullName,
      headline: p.headline ?? "",
      bio: p.bio ?? "",
      location: p.location ?? "",
      college: p.college ?? "",
      degree: p.degree ?? "",
      department: p.department ?? "",
      graduationYear: p.graduationYear ?? null,
      preferredRoles: p.preferredRoles ?? [],
      hasAvatar: Boolean(p.avatarFileId),
      image: imageOf.get(id) ?? null,
      level: p.level ?? 1,
      xp: p.xp ?? 0,
      skillLevel: p.skillLevel,
      streak: p.streak ?? { current: 0, longest: 0 },
      skills: (p.skills ?? []).map((k) => ({ name: k.name, proficiency: k.proficiency, verified: Boolean(k.verified) })),
      experience: show("experience") ? p.experience ?? [] : [],
      education: show("education") ? p.education ?? [] : [],
      projects: show("projects") ? p.projects ?? [] : [],
      githubUsername: show("github") ? p.githubUsername ?? null : null,
      linkedinUrl: show("linkedin") ? p.linkedinUrl ?? null : null,
      codeforcesHandle: p.codeforcesHandle ?? null,
      codingVisible: show("codingStats"),
      coding: show("codingStats")
        ? { solved: s.easy + s.medium + s.hard, byDifficulty: s, submissions: t?.total ?? 0, accuracy: t?.total ? Math.round((t.accepted / t.total) * 100) : null, contests: myContests.length, bestRank: myContests.reduce((m, c) => (c.rank && (!m || c.rank < m) ? c.rank : m), null) }
        : { solved: null, byDifficulty: null, submissions: null, accuracy: null, contests: null, bestRank: null },
      assessmentsVisible: show("assessmentScores"),
      assessments: show("assessmentScores")
        ? {
            best: Object.values(best).length ? Math.max(...Object.values(best)) : null,
            byCategory: Object.entries(best).map(([cat, pct]) => ({ category: cat, label: CATEGORY_LABEL[cat] ?? cat, best: pct, level: proficiencyFor(pct).level })).sort((a, b) => b.best - a.best),
          }
        : { best: null, byCategory: [] },
      badges: badgeOf.get(id) ?? 0,
      isPublic: p.isPublic !== false,
    });
  }
  return map;
}

export async function candidateSummary(studentId, { forRecruiter = false } = {}) {
  const map = await candidateSummaries([studentId], { respectPrivacy: !forRecruiter });
  return plain(map.get(String(studentId)) ?? null);
}

export const SEARCH_SORTS = ["xp", "solved", "assessment", "recent"];

/** Parses recruiter search params into a filter object. */
export function parseStudentFilters(params = {}) {
  const pick = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
  const num = (v, max) => {
    const n = Number(pick(v));
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
  };
  return {
    q: pick(params.q).slice(0, 80),
    skills: pick(params.skills).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
    verified: pick(params.verified) === "1",
    minLevel: num(params.minLevel, 100),
    minSolved: num(params.minSolved, 1000),
    category: ASSESSMENT_CATEGORIES.some((c) => c.key === pick(params.category)) ? pick(params.category) : "",
    minScore: num(params.minScore, 100),
    gradYear: num(params.gradYear, 2100),
    sort: SEARCH_SORTS.includes(pick(params.sort)) ? pick(params.sort) : "xp",
    page: Math.max(1, Math.min(20, Number(pick(params.page)) || 1)),
  };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Student search for recruiters. Only public, active students appear, and
 * hidden sections stay hidden. Skill filters match all chosen skills
 * (case-insensitive); "verified" requires each to be assessment-verified.
 */
export async function searchStudents(filters) {
  await connectToDatabase();
  const students = await mongoose.connection.collection("user").find({ role: "student" }, { projection: { _id: 1 } }).toArray();
  const query = { userId: { $in: students.map((s) => s._id) }, onboardingComplete: true, isActive: true, isPublic: { $ne: false } };
  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ fullName: rx }, { headline: rx }, { college: rx }, { department: rx }, { preferredRoles: rx }];
  }
  if (filters.skills.length) {
    query.$and = filters.skills.map((name) => ({
      skills: { $elemMatch: { name: new RegExp(`^${escapeRegex(name)}$`, "i"), ...(filters.verified ? { verified: true } : {}) } },
    }));
  }
  if (filters.minLevel) query.level = { $gte: filters.minLevel };
  if (filters.gradYear) query.graduationYear = filters.gradYear;

  const candidates = await Profile.find(query, { userId: 1, updatedAt: 1 }).sort({ xp: -1 }).limit(300).lean();
  const summaries = await candidateSummaries(candidates.map((c) => c.userId), { respectPrivacy: true });
  const updatedOf = new Map(candidates.map((c) => [String(c.userId), c.updatedAt]));
  let rows = [...summaries.values()];
  if (filters.minSolved) rows = rows.filter((r) => (r.coding.solved ?? -1) >= filters.minSolved);
  if (filters.category && filters.minScore) rows = rows.filter((r) => (r.assessments.byCategory.find((c) => c.category === filters.category)?.best ?? -1) >= filters.minScore);
  else if (filters.category) rows = rows.filter((r) => r.assessments.byCategory.some((c) => c.category === filters.category));

  const sorters = {
    xp: (a, b) => b.xp - a.xp,
    solved: (a, b) => (b.coding.solved ?? -1) - (a.coding.solved ?? -1),
    assessment: (a, b) => (b.assessments.best ?? -1) - (a.assessments.best ?? -1),
    recent: (a, b) => new Date(updatedOf.get(b.userId)) - new Date(updatedOf.get(a.userId)),
  };
  rows.sort(sorters[filters.sort]);
  const total = rows.length;
  const page = rows.slice(0, filters.page * 24);
  return plain({ total, hasMore: page.length < total, items: page });
}
