import { demoId } from "./ids.js";

/**
 * Achievement badges. `criteria.type` is evaluated on the server
 * (Phase 5) against stored stats; students can never grant themselves one.
 */
const RAW = [
  ["first-solve", "First blood", "Solve your first problem.", "Sparkles", "coding", { type: "problems_solved", threshold: 1 }, 10],
  ["ten-solves", "Getting warm", "Solve 10 problems.", "Code", "coding", { type: "problems_solved", threshold: 10 }, 25],
  ["fifty-solves", "Problem crusher", "Solve 50 problems.", "Hammer", "coding", { type: "problems_solved", threshold: 50 }, 75],
  ["hundred-solves", "Centurion", "Solve 100 problems.", "Medal", "coding", { type: "problems_solved", threshold: 100 }, 150],
  ["first-hard", "Hard mode", "Solve a hard problem.", "Mountain", "coding", { type: "hard_solved", threshold: 1 }, 30],
  ["streak-7", "On fire", "Keep a 7-day coding streak.", "Flame", "streak", { type: "streak_days", threshold: 7 }, 30],
  ["streak-30", "Unstoppable", "Keep a 30-day coding streak.", "Zap", "streak", { type: "streak_days", threshold: 30 }, 120],
  ["first-contest", "Into the arena", "Take part in a contest.", "Swords", "contest", { type: "contests_joined", threshold: 1 }, 20],
  ["contest-top-10", "Podium chaser", "Finish a contest in the top 10.", "Trophy", "contest", { type: "contest_best_rank", threshold: 10 }, 100],
  ["first-assessment", "Tested", "Complete your first assessment.", "ClipboardCheck", "assessment", { type: "assessments_completed", threshold: 1 }, 15],
  ["assessment-90", "Top of the class", "Score 90% or more in an assessment.", "Award", "assessment", { type: "assessment_best_percentage", threshold: 90 }, 50],
  ["profile-complete", "All set", "Complete every section of your profile.", "UserCheck", "profile", { type: "profile_completion", threshold: 100 }, 50],
  ["first-application", "Shot taken", "Apply to your first opportunity.", "Send", "career", { type: "applications_submitted", threshold: 1 }, 10],
];

export const achievements = RAW.map(([code, name, description, icon, category, criteria, xpBonus], i) => ({
  id: demoId("achievement", i + 1),
  code,
  name,
  description,
  icon,
  category,
  criteria,
  xpBonus,
}));
