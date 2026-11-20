"use client";

/**
 * Last-resort error page when the root layout itself fails. It replaces the
 * whole document, so it can't rely on the app's CSS: styles are inline and
 * mirror the light theme tokens.
 */
export default function GlobalError({ error, retry }) {
  const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : null;
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#F7F6FB", color: "#1B1A2E", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", padding: 16 }}>
        <title>Something went wrong · SkillArena</title>
        <main style={{ textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: "0 0 8px" }}>SkillArena hit a problem</h1>
          <p style={{ color: "#6B6A80", margin: "0 0 24px", lineHeight: 1.5 }}>The page couldn&apos;t load. Try again in a moment.</p>
          <button type="button" onClick={() => retry()} style={{ background: "#534AB7", color: "#fff", border: 0, borderRadius: 999, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}>
            Try again
          </button>
          {digest && <p style={{ color: "#6B6A80", fontSize: 12, marginTop: 16 }}>Reference: {digest}</p>}
        </main>
      </body>
    </html>
  );
}
