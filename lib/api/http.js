import "server-only";

/**
 * JSON fetch for third-party APIs: timeout, a couple of retries with backoff
 * for network errors, 429 and 5xx, and errors that say what went wrong.
 * Responses are never cached by Next; callers store what they need in MongoDB
 * and fall back to that copy when the service is down.
 */
export class ExternalApiError extends Error {
  /** code: not_found | rate_limited | unavailable | bad_response */
  constructor(source, code, message, status = null) {
    super(message);
    this.source = source;
    this.code = code;
    this.status = status;
  }
}

const USER_AGENT = "SkillArena/1.0 (student skills platform)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(url, { source, headers = {}, timeoutMs = 8000, retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let res;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      lastError = new ExternalApiError(source, "unavailable", error?.name === "TimeoutError" ? `${source} took too long to respond.` : `Couldn't reach ${source}.`);
      if (attempt < retries) await sleep(400 * 2 ** attempt);
      continue;
    }

    if (res.ok) {
      let text;
      try {
        text = await res.text();
      } catch {
        // The connection dropped while downloading: treat like any network failure.
        lastError = new ExternalApiError(source, "unavailable", `The connection to ${source} dropped. Try again later.`);
        if (attempt < retries) await sleep(400 * 2 ** attempt);
        continue;
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new ExternalApiError(source, "bad_response", `${source} sent a response we couldn't read.`, res.status);
      }
    }
    if (res.status === 404) throw new ExternalApiError(source, "not_found", `${source} returned not found.`, 404);

    const limited = res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
    lastError = new ExternalApiError(source, limited ? "rate_limited" : "unavailable", limited ? `${source} rate limit reached. Try again later.` : `${source} is unavailable (${res.status}).`, res.status);
    // Only retry what can succeed soon: 5xx, or a 429 with a short Retry-After.
    const retryAfter = Number(res.headers.get("retry-after"));
    const canRetry = res.status >= 500 || (res.status === 429 && retryAfter > 0 && retryAfter <= 5);
    if (!canRetry || attempt >= retries) break;
    await sleep(res.status === 429 ? retryAfter * 1000 : 400 * 2 ** attempt);
  }
  throw lastError;
}
