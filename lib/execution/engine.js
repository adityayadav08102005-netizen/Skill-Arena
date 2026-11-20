import "server-only";
import { ExecutionUnavailableError } from "./errors";
import { executeOnce as judge0Execute } from "./judge0";
import { checkPaiza, executeOnce as paizaExecute } from "./paiza";

export { ExecutionUnavailableError };

/**
 * Which code runner is active:
 *  - "judge0": JUDGE0_URL is set (RapidAPI or self-hosted); takes priority.
 *  - "paiza":  CODE_RUNNER=paiza, the free Paiza.io API (no key).
 *  - "demo":   neither, so submissions are saved as "not executed" and earn no XP.
 * Paiza is opt-in so tests and CI never send code to an outside service by accident.
 */
export function executionMode() {
  if (process.env.JUDGE0_URL) return "judge0";
  if ((process.env.CODE_RUNNER || "").toLowerCase() === "paiza") return "paiza";
  return "demo";
}

export function isExecutionConfigured() {
  return executionMode() !== "demo";
}

/** Tests that may run at once for one submission (Paiza runs take about a second each). */
export function parallelRuns() {
  return executionMode() === "paiza" ? 3 : 1;
}

export async function executeOnce(args) {
  const mode = executionMode();
  if (mode === "judge0") return judge0Execute(args);
  if (mode === "paiza") return paizaExecute(args);
  throw new ExecutionUnavailableError("Code execution isn't configured.");
}

/** Admin status: which runner, and whether it answers. */
export async function checkRunner() {
  const mode = executionMode();
  if (mode === "paiza") return { mode, label: "Paiza.io", ...(await checkPaiza()) };
  if (mode === "judge0") {
    const { checkJudge0 } = await import("@/lib/api/providers");
    return { mode, label: "Judge0", ...(await checkJudge0()) };
  }
  return { mode, label: "Demo mode", configured: false };
}
