import "server-only";
import { fetchJson, ExternalApiError } from "./http";
import { mapAdzunaJob, mapArbeitnowJob, mapHimalayasJob, mapJobicyJob, mapRemotiveJob } from "./jobs/map";
import { mapCodeforces, mapGithub } from "./profiles/map";
import { mapCodechefContests, mapCodeforcesContests, mapCodeforcesProblems, mapLeetcodeContests } from "./contests/map";

/* ── GitHub ─────────────────────────────────────────────────────── */
const GITHUB = "https://api.github.com";
const githubHeaders = () => ({
  "X-GitHub-Api-Version": "2022-11-28",
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

export const GITHUB_USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Public GitHub profile summary. Uses GITHUB_TOKEN when set (5,000 requests/hour instead of 60). */
export async function fetchGithubSummary(username) {
  if (!GITHUB_USERNAME.test(username)) throw new ExternalApiError("GitHub", "not_found", "That isn't a valid GitHub username.");
  const name = encodeURIComponent(username);
  const user = await fetchJson(`${GITHUB}/users/${name}`, { source: "GitHub", headers: githubHeaders() });
  if (user?.type && user.type !== "User") throw new ExternalApiError("GitHub", "not_found", "That GitHub account isn't a personal account.");
  const repos = await fetchJson(`${GITHUB}/users/${name}/repos?type=owner&sort=pushed&per_page=50`, { source: "GitHub", headers: githubHeaders() });
  return mapGithub(user, Array.isArray(repos) ? repos : []);
}

/* ── Codeforces ─────────────────────────────────────────────────── */
const CODEFORCES = "https://codeforces.com/api";
export const CODEFORCES_HANDLE = /^[A-Za-z0-9_.-]{3,24}$/;

async function codeforces(method, params) {
  const data = await fetchJson(`${CODEFORCES}/${method}?${new URLSearchParams(params)}`, { source: "Codeforces", retries: 1 });
  if (data?.status !== "OK") {
    const notFound = /not found/i.test(data?.comment ?? "");
    throw new ExternalApiError("Codeforces", notFound ? "not_found" : "bad_response", notFound ? "Codeforces handle not found." : "Codeforces sent an unexpected response.");
  }
  return data.result;
}

/** Codeforces rating summary: user.info plus the rated-contest history. */
export async function fetchCodeforcesSummary(handle) {
  if (!CODEFORCES_HANDLE.test(handle)) throw new ExternalApiError("Codeforces", "not_found", "That isn't a valid Codeforces handle.");
  let info;
  try {
    [info] = await codeforces("user.info", { handles: handle });
  } catch (error) {
    // Unknown handles come back as HTTP 400, which fetchJson reports as "unavailable".
    if (error instanceof ExternalApiError && error.status === 400) throw new ExternalApiError("Codeforces", "not_found", "Codeforces handle not found.", 400);
    throw error;
  }
  const history = await codeforces("user.rating", { handle: info.handle });
  return mapCodeforces(info, history);
}

/* ── Job boards ─────────────────────────────────────────────────── */
/**
 * Remotive's terms: link back to the listing, credit Remotive as the source,
 * and fetch at most a few times a day (we sync at most every 6 hours).
 */
export async function fetchRemotiveJobs(catalogue) {
  const data = await fetchJson("https://remotive.com/api/remote-jobs?category=software-dev", { source: "Remotive", timeoutMs: 15_000 });
  const jobs = Array.isArray(data?.jobs) ? data.jobs : null;
  if (!jobs) throw new ExternalApiError("Remotive", "bad_response", "Remotive sent an unexpected response.");
  return { fetched: jobs.length, items: jobs.map((j) => mapRemotiveJob(j, catalogue)).filter(Boolean) };
}

/** Arbeitnow's free API (updated hourly): the newest 300 jobs, one request per sync. */
export async function fetchArbeitnowJobs(catalogue) {
  const data = await fetchJson("https://www.arbeitnow.com/api/job-board-api", { source: "Arbeitnow", timeoutMs: 25_000, retries: 1 });
  if (!Array.isArray(data?.data)) throw new ExternalApiError("Arbeitnow", "bad_response", "Arbeitnow sent an unexpected response.");
  return { fetched: data.data.length, items: data.data.map((j) => mapArbeitnowJob(j, catalogue)).filter(Boolean) };
}

/** Himalayas' free search API: software jobs and software internships, one page each. */
export async function fetchHimalayasJobs(catalogue) {
  const all = [];
  for (const q of ["software engineer", "software intern"]) {
    const data = await fetchJson(`https://himalayas.app/jobs/api/search?${new URLSearchParams({ q })}`, { source: "Himalayas", timeoutMs: 15_000, retries: 1 });
    if (!Array.isArray(data?.jobs)) throw new ExternalApiError("Himalayas", "bad_response", "Himalayas sent an unexpected response.");
    all.push(...data.jobs);
  }
  const unique = [...new Map(all.map((j) => [j.guid || j.applicationLink, j])).values()];
  return { fetched: unique.length, items: unique.map((j) => mapHimalayasJob(j, catalogue)).filter(Boolean) };
}

/** Jobicy's free API: the newest 50 remote software jobs. */
export async function fetchJobicyJobs(catalogue) {
  const data = await fetchJson("https://jobicy.com/api/v2/remote-jobs?count=50&industry=dev", { source: "Jobicy", timeoutMs: 15_000, retries: 1 });
  if (!Array.isArray(data?.jobs)) throw new ExternalApiError("Jobicy", "bad_response", "Jobicy sent an unexpected response.");
  return { fetched: data.jobs.length, items: data.jobs.map((j) => mapJobicyJob(j, catalogue)).filter(Boolean) };
}

/** Adzuna needs a free app ID and key (https://developer.adzuna.com). */
export function adzunaConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

/** Adzuna India: IT internships and software developer jobs from the last 30 days. */
export async function fetchAdzunaJobs(catalogue) {
  if (!adzunaConfigured()) throw new ExternalApiError("Adzuna", "unavailable", "Adzuna isn't configured (set ADZUNA_APP_ID and ADZUNA_APP_KEY).");
  const all = [];
  for (const what of ["intern", "software developer"]) {
    const params = new URLSearchParams({ app_id: process.env.ADZUNA_APP_ID, app_key: process.env.ADZUNA_APP_KEY, results_per_page: "50", what, category: "it-jobs", max_days_old: "30", "content-type": "application/json" });
    const data = await fetchJson(`https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`, { source: "Adzuna", timeoutMs: 15_000, retries: 1 });
    if (!Array.isArray(data?.results)) throw new ExternalApiError("Adzuna", "bad_response", "Adzuna sent an unexpected response.");
    all.push(...data.results);
  }
  const unique = [...new Map(all.map((j) => [String(j.id), j])).values()];
  return { fetched: unique.length, items: unique.map((j) => mapAdzunaJob(j, catalogue)).filter(Boolean) };
}

/* ── Other platforms' contests and the Codeforces problem set ───── */
export async function fetchCodeforcesUpcoming() {
  const data = await fetchJson("https://codeforces.com/api/contest.list?gym=false", { source: "Codeforces", retries: 1 });
  if (data?.status !== "OK") throw new ExternalApiError("Codeforces", "bad_response", "Codeforces sent an unexpected response.");
  return mapCodeforcesContests(data.result);
}

/** LeetCode has no official API; this is the public endpoint its own contest page uses. */
export async function fetchLeetcodeUpcoming() {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/contest/", "User-Agent": "SkillArena/1.0 (student skills platform)" },
    body: JSON.stringify({ query: "{ upcomingContests { title titleSlug startTime duration } }" }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) throw new ExternalApiError("LeetCode", "unavailable", "LeetCode's contest list isn't available right now.");
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.data?.upcomingContests)) throw new ExternalApiError("LeetCode", "bad_response", "LeetCode sent an unexpected response.");
  return mapLeetcodeContests(data.data.upcomingContests);
}

export async function fetchCodechefUpcoming() {
  const data = await fetchJson("https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all", { source: "CodeChef", retries: 1 });
  if (!Array.isArray(data?.future_contests)) throw new ExternalApiError("CodeChef", "bad_response", "CodeChef sent an unexpected response.");
  return mapCodechefContests(data.future_contests);
}

/** The whole Codeforces problem set (about 11,000 problems, ~2 MB). */
export async function fetchCodeforcesProblemset() {
  const data = await fetchJson("https://codeforces.com/api/problemset.problems", { source: "Codeforces", timeoutMs: 30_000, retries: 1 });
  if (data?.status !== "OK") throw new ExternalApiError("Codeforces", "bad_response", "Codeforces sent an unexpected response.");
  return mapCodeforcesProblems(data.result);
}

/* ── Judge0 ─────────────────────────────────────────────────────── */
/** Reachability check for the code runner (GET /about). */
export async function checkJudge0() {
  const base = process.env.JUDGE0_URL?.replace(/\/$/, "");
  if (!base) return { configured: false };
  const headers = {};
  const key = process.env.JUDGE0_API_KEY;
  const host = process.env.JUDGE0_API_HOST;
  if (key && host) Object.assign(headers, { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host });
  else if (key) headers["X-Auth-Token"] = key;
  const started = Date.now();
  try {
    const about = await fetchJson(`${base}/about`, { source: "Judge0", headers, timeoutMs: 6000, retries: 0 });
    return { configured: true, ok: true, version: about?.version ?? null, latencyMs: Date.now() - started };
  } catch (error) {
    return { configured: true, ok: false, error: error.message, latencyMs: Date.now() - started };
  }
}
