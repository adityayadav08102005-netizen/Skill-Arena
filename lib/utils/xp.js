/**
 * XP and level rules shared by the server, the seed script and demo mode.
 * Level L starts at 25·(L−1)² XP: L2 = 25, L5 = 400, L10 = 2025, L15 = 4900.
 */
export const XP_RULES = {
  problemSolved: { easy: 10, medium: 30, hard: 50 },
  dailyChallengeBonus: 15,
  contestParticipation: 20,
  assessmentPassed: 40,
  assessmentMilestone90: 25,
  profileComplete: 50,
  streakMilestones: { 7: 30, 30: 120, 100: 400 },
};

export function levelForXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
}

export function xpForLevel(level) {
  return 25 * (level - 1) ** 2;
}

/** Progress within the current level, for rings and progress bars. */
export function levelProgress(xp) {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - start, needed: next - start, toNext: next - xp, percent: Math.round(((xp - start) / (next - start)) * 100) };
}

export function skillLevelFor(level) {
  if (level >= 15) return "expert";
  if (level >= 10) return "advanced";
  if (level >= 5) return "intermediate";
  return "beginner";
}
