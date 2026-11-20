import "server-only";
import { ExecutionUnavailableError } from "./errors";
import { LANGUAGES, judge0LanguageId } from "./languages";

export { ExecutionUnavailableError };

/**
 * Minimal Judge0 client (server-only; credentials never reach the browser).
 *
 * Configure one of:
 *   - RapidAPI (free tier):  JUDGE0_URL=https://judge0-ce.p.rapidapi.com
 *                            JUDGE0_API_KEY=<key>  JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
 *   - Self-hosted Judge0:    JUDGE0_URL=http://your-host:2358  (JUDGE0_API_KEY = X-Auth-Token, optional)
 */

export function isExecutionConfigured() {
  return Boolean(process.env.JUDGE0_URL);
}

function headers() {
  const h = { "Content-Type": "application/json" };
  const key = process.env.JUDGE0_API_KEY;
  const host = process.env.JUDGE0_API_HOST;
  if (key && host) {
    h["X-RapidAPI-Key"] = key;
    h["X-RapidAPI-Host"] = host;
  } else if (key) {
    h["X-Auth-Token"] = key;
  }
  return h;
}

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

// Judge0 status ids → our submission statuses.
function mapStatus(id) {
  if (id === 3) return "accepted";
  if (id === 4) return "wrong_answer";
  if (id === 5) return "time_limit_exceeded";
  if (id === 6) return "compilation_error";
  if (id >= 7 && id <= 12) return "runtime_error";
  return "internal_error"; // 1/2 still queued, 13 internal error, 14 exec format error
}

/**
 * Runs `code` once with `stdin`. Returns
 * { status, stdout, stderr, compileOutput, timeMs, memoryKb } where status is
 * "ran" (finished; compare stdout yourself), "time_limit_exceeded",
 * "compilation_error", "runtime_error" or "internal_error".
 */
export async function executeOnce({ language, code, stdin }) {
  const base = process.env.JUDGE0_URL?.replace(/\/$/, "");
  if (!base) throw new ExecutionUnavailableError("Code execution isn't configured.");

  let res;
  try {
    res = await fetch(`${base}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,message,status,time,memory`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        source_code: b64(code),
        language_id: judge0LanguageId(language),
        stdin: b64(stdin),
        cpu_time_limit: LANGUAGES[language].timeLimit,
        wall_time_limit: LANGUAGES[language].timeLimit * 3,
        memory_limit: 256_000,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new ExecutionUnavailableError(
      error?.name === "TimeoutError" ? "The code runner took too long to respond. Try again." : "Couldn't reach the code runner. Try again.",
    );
  }

  if (res.status === 429) throw new ExecutionUnavailableError("The code runner's rate limit was reached. Wait a minute and try again.", 429);
  if (res.status === 401 || res.status === 403) throw new ExecutionUnavailableError("The code runner rejected our credentials. Check JUDGE0_API_KEY.");
  if (!res.ok) throw new ExecutionUnavailableError(`The code runner returned an error (${res.status}).`);

  const data = await res.json();
  const mapped = mapStatus(data.status?.id);
  return {
    // Judge0 says "wrong_answer" only when expected_output is sent; we compare ourselves, so a clean exit is "ran".
    status: mapped === "accepted" || mapped === "wrong_answer" ? "ran" : mapped,
    stdout: unb64(data.stdout),
    stderr: unb64(data.stderr),
    compileOutput: unb64(data.compile_output),
    message: data.message ? unb64(data.message) : "",
    timeMs: data.time ? Math.round(Number(data.time) * 1000) : null,
    memoryKb: data.memory ?? null,
  };
}
