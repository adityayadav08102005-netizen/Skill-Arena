/**
 * Security headers for every response (applied in next.config.mjs).
 *
 * CSP notes:
 * - Next.js inlines small bootstrap scripts, so script-src needs 'unsafe-inline'
 *   (a nonce-based policy would force every page to render per request and give
 *   up partial prerendering). React escapes all rendered text and nothing uses
 *   dangerouslySetInnerHTML, which is what keeps injected markup inert.
 * - The code editor (Monaco) loads from cdn.jsdelivr.net and runs its workers
 *   from blob: URLs.
 * - Google profile photos come from lh3.googleusercontent.com.
 */
export function securityHeaders({ production = process.env.NODE_ENV === "production" } = {}) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    `connect-src 'self' https://cdn.jsdelivr.net${production ? "" : " ws: wss:"}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  ];
}
