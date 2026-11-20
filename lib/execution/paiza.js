import "server-only";
import { ExecutionUnavailableError } from "./errors";

/**
 * Paiza.io runner (https://api.paiza.io): free, no sign-up, using the public
 * "guest" key. Each run is a create call that long-polls for up to 10 s, then
 * a details call. Programs are stopped after about one second, so problems
 * are designed with small inputs. Code runs on Paiza's servers, never here.
 */
const BASE = "https://api.paiza.io/runners";
const KEY = () => process.env.PAIZA_API_KEY || "guest";
const LANG = { python: "python3", java: "java", cpp: "cpp", javascript: "javascript" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, init) {
  let res;
  try {
    res = await fetch(`${BASE}/${path}`, { ...init, signal: AbortSignal.timeout(25_000), cache: "no-store" });
  } catch (error) {
    throw new ExecutionUnavailableError(error?.name === "TimeoutError" ? "The code runner took too long to respond. Try again." : "Couldn't reach the code runner. Try again.");
  }
  if (res.status === 429) throw new ExecutionUnavailableError("The code runner is busy. Wait a moment and try again.", 429);
  if (!res.ok) throw new ExecutionUnavailableError(`The code runner returned an error (${res.status}).`);
  const data = await res.json().catch(() => null);
  if (!data || data.error) throw new ExecutionUnavailableError(data?.error ? `The code runner refused the run: ${data.error}` : "The code runner sent an unreadable response.");
  return data;
}

/** Same contract as judge0.executeOnce: { status: ran|time_limit_exceeded|compilation_error|runtime_error|internal_error, stdout, stderr, compileOutput, message, timeMs, memoryKb }. */
export async function executeOnce({ language, code, stdin }) {
  const lang = LANG[language];
  if (!lang) throw new ExecutionUnavailableError("This language isn't supported by the code runner.", 422);
  const body = new URLSearchParams({ source_code: code, language: lang, input: stdin ?? "", api_key: KEY(), longpoll: "true", longpoll_timeout: "10" });
  const created = await call("create", { method: "POST", body });
  if (!created.id) throw new ExecutionUnavailableError("The code runner didn't accept the program.");

  let details;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    details = await call(`get_details?${new URLSearchParams({ id: created.id, api_key: KEY() })}`);
    if (details.status === "completed") break;
    await sleep(500);
  }
  if (details?.status !== "completed") throw new ExecutionUnavailableError("The code runner took too long to finish. Try again.");

  const timeMs = details.time != null ? Math.round(Number(details.time) * 1000) : null;
  const memoryKb = details.memory != null ? Math.round(Number(details.memory) / 1000) : null;
  const base = { stdout: details.stdout ?? "", stderr: details.stderr ?? "", compileOutput: "", message: "", timeMs, memoryKb };

  if (details.build_result === "failure") return { ...base, status: "compilation_error", compileOutput: details.build_stderr || details.build_stdout || "Compilation failed." };
  if (details.result === "timeout") return { ...base, status: "time_limit_exceeded" };
  if (details.result === "failure" || (details.exit_code != null && String(details.exit_code) !== "0")) return { ...base, status: "runtime_error" };
  if (details.result === "success") return { ...base, status: "ran" };
  return { ...base, status: "internal_error", message: "The code runner returned an unexpected result." };
}

/** Health check for the admin page: runs a one-line program. */
export async function checkPaiza() {
  const started = Date.now();
  try {
    const run = await executeOnce({ language: "python", code: "print(6 * 7)", stdin: "" });
    const ok = run.status === "ran" && run.stdout.trim() === "42";
    return { configured: true, ok, latencyMs: Date.now() - started, ...(ok ? {} : { error: `Unexpected result: ${run.status}` }) };
  } catch (error) {
    return { configured: true, ok: false, error: error.message, latencyMs: Date.now() - started };
  }
}
