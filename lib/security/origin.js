/**
 * Same-origin check for state-changing requests (CSRF defence in depth; the
 * session cookie is also SameSite=Lax).
 *
 * - Origin present: it must match this site's host (or BETTER_AUTH_URL, the
 *   public URL behind a proxy).
 * - Origin missing: browsers send Origin on every cross-site POST, so a missing
 *   one means a non-browser client (curl, a server). Those can't ride a
 *   visitor's cookies, so they're allowed and still need a valid session.
 */
export function isSameOrigin(request, publicUrl = process.env.BETTER_AUTH_URL) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false; // sandboxed iframes, file:// pages
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set([request.headers.get("x-forwarded-host"), request.headers.get("host"), request.nextUrl?.host].filter(Boolean));
  if (publicUrl) {
    try {
      allowed.add(new URL(publicUrl).host);
    } catch {
      /* ignore an invalid BETTER_AUTH_URL here; instrumentation reports it */
    }
  }
  return allowed.has(originHost);
}
