import "server-only";
import { executeOnce, parallelRuns } from "./engine";

/** Compare outputs ignoring trailing spaces on each line and trailing blank lines. */
export function normalizeOutput(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

const clip = (s, n = 2000) => (s && s.length > n ? `${s.slice(0, n)}\n… (truncated)` : s || "");

/**
 * Runs `code` against `tests` ([{ input, output, hidden }]) and stops at the
 * first failure, like most judges. Hidden tests never return their input or
 * expected output — only whether they passed.
 *
 * Returns { status, passed, total, timeMs, memoryKb, results, compileOutput }
 * where status is accepted | wrong_answer | time_limit_exceeded |
 * runtime_error | compilation_error | internal_error.
 */
export async function runTests({ language, code, tests }) {
  const results = [];
  let maxTime = 0;
  let maxMemory = 0;

  // Run a few tests at a time when the runner is slow per run (Paiza), but still
  // report like a judge that stops at the first failing test.
  const batch = parallelRuns();
  let pending = [];
  for (let i = 0; i < tests.length; i += 1) {
    const test = tests[i];
    if (i % batch === 0) pending = await Promise.all(tests.slice(i, i + batch).map((t) => executeOnce({ language, code, stdin: t.input })));
    const run = pending[i % batch];
    if (run.timeMs) maxTime = Math.max(maxTime, run.timeMs);
    if (run.memoryKb) maxMemory = Math.max(maxMemory, run.memoryKb);

    if (run.status === "compilation_error") {
      return { status: "compilation_error", passed: 0, total: tests.length, timeMs: null, memoryKb: null, results: [], compileOutput: clip(run.compileOutput) };
    }

    const passed = run.status === "ran" && normalizeOutput(run.stdout) === normalizeOutput(test.output);
    const status = run.status === "ran" ? (passed ? "accepted" : "wrong_answer") : run.status;
    results.push({
      index: i,
      hidden: Boolean(test.hidden),
      status,
      passed,
      timeMs: run.timeMs,
      ...(test.hidden
        ? {}
        : { input: test.input, expected: test.output, actual: clip(run.stdout, 4000), stderr: clip(run.stderr || run.message) }),
    });
    if (!passed) {
      return { status, passed: i, total: tests.length, timeMs: maxTime || null, memoryKb: maxMemory || null, results };
    }
  }

  return { status: "accepted", passed: tests.length, total: tests.length, timeMs: maxTime || null, memoryKb: maxMemory || null, results };
}

/** Runs once with custom input (the "Run" button with your own stdin). */
export async function runCustom({ language, code, input }) {
  const run = await executeOnce({ language, code, stdin: input });
  return {
    status: run.status === "ran" ? "ran" : run.status,
    output: clip(run.stdout, 4000),
    stderr: clip(run.stderr || run.message),
    compileOutput: clip(run.compileOutput),
    timeMs: run.timeMs,
    memoryKb: run.memoryKb,
  };
}
