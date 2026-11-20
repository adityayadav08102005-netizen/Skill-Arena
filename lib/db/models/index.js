/**
 * All SkillArena models. Spec table → MongoDB collection:
 *   profiles, student_skills, education, projects, coding_streaks → profiles (embedded)
 *   skills → skills · problems → problems · problem_submissions → problem_submissions
 *   contests (+ contest problems embedded) → contests
 *   contest_participants, contest_submissions → same names
 *   assessments, questions, assessment_attempts → same names
 *   achievements, user_achievements → same names
 *   opportunities, saved_opportunities, applications → same names
 *   recruiter_companies → recruiter_companies
 *   activity_logs, notifications → same names
 * Added: daily_challenges, daily_challenge_completions, xp_events, content_reports,
 *   external_profiles (GitHub/Codeforces snapshots), integrations (job board syncs).
 * Better Auth manages: user, session, account, verification.
 */
export { Profile } from "./profile.js";
export { Skill, Problem, ProblemSubmission, DailyChallenge, DailyChallengeCompletion } from "./algoarena.js";
export { Contest, ContestParticipant, ContestSubmission } from "./contests.js";
export { Assessment, Question, AssessmentAttempt, ASSESSMENT_CATEGORY_KEYS } from "./assessments.js";
export { Achievement, UserAchievement, XpEvent } from "./gamification.js";
export { Company, Opportunity, SavedOpportunity, Application, APPLICATION_STATUSES } from "./skillbridge.js";
export { ActivityLog, Notification, ContentReport } from "./activity.js";
export { CfProblem, ExternalCache, ExternalProfile, Integration } from "./integrations.js";
