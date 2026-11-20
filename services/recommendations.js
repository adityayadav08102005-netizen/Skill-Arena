import "server-only";

/**
 * Career matching.
 *
 * `scoreOpportunity(student, opportunity)` explains how well one listing fits:
 * { score 0–100, eligible, overlap, matchedSkills, missingSkills, reasons }.
 * A recommender is any object with `recommend(student, opportunities, options)`
 * returning the best eligible matches; the rule-based one below is the default
 * and an AI-based recommender can replace it via getRecommender().
 *
 * `student` is a plain profile: { skills: [{ name, proficiency }], preferredRoles,
 * graduationYear, experience: [] }.
 */

const norm = (s) => String(s).trim().toLowerCase();
// Generic job-title words that would make every title "match" a preferred role.
const GENERIC = new Set(["developer", "engineer", "intern", "internship", "software", "junior", "senior", "associate", "trainee", "graduate", "part", "time", "role", "the", "and"]);
const words = (s) => norm(s).split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2 && !GENERIC.has(w));
const MIN_SCORE = 30;

/** Graduation-year eligibility: an empty list means any year. */
export function isEligibleYear(opportunity, graduationYear) {
  const years = opportunity.graduationYears ?? [];
  return !years.length || !graduationYear || years.includes(graduationYear);
}

export function scoreOpportunity(student, opp) {
  const skills = new Map((student.skills ?? []).map((s) => [norm(s.name), s.proficiency ?? 3]));
  const roleWords = new Set((student.preferredRoles ?? []).flatMap(words));
  const hasExperience = (student.experience?.length ?? 0) > 0;
  const years = opp.graduationYears ?? [];

  const required = opp.requiredSkills ?? [];
  const preferred = opp.preferredSkills ?? [];
  const matchedSkills = required.filter((s) => skills.has(norm(s)));
  const missingSkills = required.filter((s) => !skills.has(norm(s)));
  const matchedPreferred = preferred.filter((s) => skills.has(norm(s)));
  const reasons = [];

  // Skill fit (max 70): required coverage weighted by self-rated proficiency, plus a preferred-skills bonus.
  const requiredScore = required.length
    ? matchedSkills.reduce((sum, s) => sum + 0.6 + 0.1 * (skills.get(norm(s)) - 1), 0) / required.length
    : 0.5;
  let score = Math.min(1, requiredScore) * 60 + (preferred.length ? (matchedPreferred.length / preferred.length) * 10 : 0);
  if (matchedSkills.length) reasons.push(`You have ${matchedSkills.length} of ${required.length} required skills`);

  // Eligibility and graduation year (max 15).
  const eligible = isEligibleYear(opp, student.graduationYear);
  if (years.length && student.graduationYear && years.includes(student.graduationYear)) {
    score += 15;
    reasons.push(`Open to the ${student.graduationYear} batch`);
  } else if (!years.length) {
    score += 10;
  }

  // Preferred-role keywords in the title (max 10).
  const roleMatch = words(opp.title).some((w) => roleWords.has(w));
  if (roleMatch) {
    score += 10;
    reasons.push("Matches a role you're looking for");
  }

  // Experience level (max 5, or a penalty for senior roles without experience).
  if (opp.experienceLevel === "fresher" || opp.experienceLevel === "0-1") score += 5;
  else if (!hasExperience) score -= 15;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    eligible,
    overlap: matchedSkills.length > 0 || matchedPreferred.length > 0 || roleMatch,
    matchedSkills,
    missingSkills,
    reasons,
  };
}

const isOpen = (opp, now) => (!opp.status || opp.status === "published") && (!opp.applicationDeadline || new Date(opp.applicationDeadline) >= now);

export const ruleBasedRecommender = {
  name: "rule-based-v1",

  recommend(student, opportunities, { now = new Date(), excludeIds = new Set(), limit = 6 } = {}) {
    return opportunities
      .filter((opp) => !excludeIds.has(String(opp._id ?? opp.id)) && isOpen(opp, now))
      .map((opp) => ({ opportunity: opp, ...scoreOpportunity(student, opp) }))
      // Eligibility alone is not a recommendation: require some skill or role overlap.
      .filter((r) => r.eligible && r.overlap && r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
};

export function getRecommender() {
  return ruleBasedRecommender;
}
