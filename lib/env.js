/**
 * Environment checks run once at server start (instrumentation.js). Pure and
 * import-free so scripts/test-env.mjs can test it with plain Node.
 *
 * Errors stop a production server from starting with an unsafe or broken
 * configuration; warnings only log. Without MONGODB_URI the site runs in demo
 * mode, which needs nothing else.
 */
export function checkEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const production = env.NODE_ENV === "production";
  const isLocal = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(url ?? "");

  if (!env.MONGODB_URI) {
    warnings.push("MONGODB_URI is not set: running in demo mode (sample data, no sign-in).");
    return { errors, warnings, mode: "demo" };
  }
  if (!/^mongodb(\+srv)?:\/\//.test(env.MONGODB_URI)) errors.push("MONGODB_URI must start with mongodb:// or mongodb+srv://.");

  const secret = env.BETTER_AUTH_SECRET ?? "";
  if (!secret) errors.push("BETTER_AUTH_SECRET is required (generate one with: openssl rand -base64 32).");
  else if (secret.length < 32) errors.push("BETTER_AUTH_SECRET must be at least 32 characters.");
  else if (/change|example|secret|placeholder|memory-db-only/i.test(secret) && production) errors.push("BETTER_AUTH_SECRET looks like a placeholder; generate a random one for production.");

  if (!env.BETTER_AUTH_URL) errors.push("BETTER_AUTH_URL is required (the site's public URL, e.g. https://skillarena.example.com).");
  else {
    try {
      const url = new URL(env.BETTER_AUTH_URL);
      if (production && url.protocol !== "https:" && !isLocal(env.BETTER_AUTH_URL)) errors.push("BETTER_AUTH_URL must use https in production.");
    } catch {
      errors.push("BETTER_AUTH_URL isn't a valid URL.");
    }
  }

  if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) errors.push("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither.");
  if (!env.GOOGLE_CLIENT_ID) warnings.push("Google sign-in is off (GOOGLE_CLIENT_ID/SECRET not set); email and password still work.");

  if (env.JUDGE0_URL) {
    try {
      const url = new URL(env.JUDGE0_URL);
      if (production && url.protocol !== "https:" && !isLocal(env.JUDGE0_URL)) warnings.push("JUDGE0_URL isn't https: code and API keys would travel unencrypted.");
      if (production && isLocal(env.JUDGE0_URL)) errors.push("JUDGE0_URL points at localhost in production (the development mock must never run in production).");
    } catch {
      errors.push("JUDGE0_URL isn't a valid URL.");
    }
    if (env.JUDGE0_API_HOST && !env.JUDGE0_API_KEY) errors.push("JUDGE0_API_HOST is set without JUDGE0_API_KEY.");
  } else if ((env.CODE_RUNNER || "").toLowerCase() !== "paiza") {
    warnings.push("No code runner: set CODE_RUNNER=paiza (free) or JUDGE0_URL, otherwise code runs in demo mode (not executed, no XP).");
  }
  if (env.CODE_RUNNER && !["paiza", "demo"].includes(env.CODE_RUNNER.toLowerCase())) errors.push('CODE_RUNNER must be "paiza" or "demo" (Judge0 is chosen by setting JUDGE0_URL).');

  if (!env.GITHUB_TOKEN) warnings.push("GITHUB_TOKEN is not set: GitHub allows 60 requests an hour from this server.");
  if (env.CRON_SECRET && env.CRON_SECRET.length < 16) errors.push("CRON_SECRET must be at least 16 characters.");
  if (!env.CRON_SECRET) warnings.push("CRON_SECRET is not set: the scheduled job import endpoint is off (imports still run from SkillBridge and the admin console).");
  if (env.DEMO_USER_PASSWORD && production) warnings.push("DEMO_USER_PASSWORD is set in production: remove it once seeding is done.");

  return { errors, warnings, mode: "database" };
}
