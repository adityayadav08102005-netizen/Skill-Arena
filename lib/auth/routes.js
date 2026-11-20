/**
 * Where each role lands after signing in. Updated as later phases add the
 * student dashboard (Phase 3), recruiter portal (Phase 8) and admin module (Phase 9).
 */
const HOME_BY_ROLE = {
  student: "/dashboard",
  recruiter: "/recruiter",
  admin: "/admin",
};

export function homeFor(role) {
  return HOME_BY_ROLE[role] ?? "/profile";
}

/** Paths that need a signed-in user. Checked optimistically in proxy.js and for real in page guards. */
export const PROTECTED_PREFIXES = ["/dashboard", "/achievements", "/applications", "/assessments/attempt", "/recruiter", "/admin", "/profile", "/settings", "/onboarding", "/continue"];

/** Only allow same-site relative redirects, to avoid open redirects via ?next=. */
export function safeNext(next, fallback = "/continue") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
