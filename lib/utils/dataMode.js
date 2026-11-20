/**
 * SkillArena runs in one of two data modes:
 *  - "database": MONGODB_URI is set, so reads and writes go to MongoDB.
 *  - "demo":     no database configured, so services read the bundled sample
 *                data in /data and every screen shows a "Demo data" badge.
 * Server-only: MONGODB_URI is never exposed to the browser.
 */
export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export function getDataMode() {
  return isDatabaseConfigured() ? "database" : "demo";
}

/** Google sign-in is offered only when both OAuth credentials are present. */
export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
