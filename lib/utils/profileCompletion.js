/**
 * Profile completion for students: each check is worth the same share.
 * Shared by the profile page, the dashboard (Phase 3) and the XP award.
 */
const STUDENT_CHECKS = [
  ["Full name", (p) => Boolean(p.fullName)],
  ["Profile photo", (p, u) => Boolean(p.avatarFileId || u?.image)],
  ["Headline", (p) => Boolean(p.headline)],
  ["College and degree", (p) => Boolean(p.college && p.degree)],
  ["Graduation year", (p) => Boolean(p.graduationYear)],
  ["At least 3 skills", (p) => (p.skills?.length ?? 0) >= 3],
  ["Education", (p) => (p.education?.length ?? 0) > 0],
  ["A project", (p) => (p.projects?.length ?? 0) > 0],
  ["GitHub or LinkedIn", (p) => Boolean(p.githubUsername || p.linkedinUrl)],
  ["Resume", (p) => Boolean(p.resumeFileId)],
];

const RECRUITER_CHECKS = [
  ["Full name", (p) => Boolean(p.fullName)],
  ["Profile photo", (p, u) => Boolean(p.avatarFileId || u?.image)],
  ["Job title", (p) => Boolean(p.jobTitle)],
  ["Company", (p) => Boolean(p.companyId)],
];

export function profileCompletion(profile, user) {
  if (!profile) return { percent: 0, missing: [] };
  const checks = user?.role === "recruiter" ? RECRUITER_CHECKS : STUDENT_CHECKS;
  const missing = checks.filter(([, test]) => !test(profile, user)).map(([label]) => label);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}
