/**
 * Runs once when a server instance starts. Checks the environment so a
 * production deploy with a missing or unsafe setting fails loudly at start-up
 * instead of misbehaving later. In development problems are only logged.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnv } = await import("./lib/env.js");
  const { errors, warnings, mode } = checkEnv(process.env);
  for (const w of warnings) console.warn(`[config] ${w}`);
  if (errors.length) {
    const message = `[config] ${errors.length} configuration problem${errors.length === 1 ? "" : "s"}:\n  - ${errors.join("\n  - ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.error(message);
  }
  console.info(`[config] SkillArena starting in ${mode} mode.`);
}

/** Server errors in one structured log line (no third-party service; hosts collect stdout). */
export async function onRequestError(error, request, context) {
  console.error(
    JSON.stringify({
      level: "error",
      message: error instanceof Error ? error.message : String(error),
      digest: typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined,
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      route: context.routePath,
    }),
  );
}
