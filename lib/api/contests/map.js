/**
 * Pure mapping of other platforms' contest lists and the Codeforces problem
 * set. No server-only imports, so scripts/test-external.mjs tests it with Node.
 * We store names, times, ratings, tags and links only: never problem statements.
 */

const validDate = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d : null);

/** Codeforces contest.list → upcoming contests. */
export function mapCodeforcesContests(result = [], now = Date.now()) {
  return result
    .filter((c) => c.phase === "BEFORE" && c.startTimeSeconds && c.startTimeSeconds * 1000 > now)
    .map((c) => ({
      platform: "codeforces",
      id: `cf-${c.id}`,
      title: String(c.name).slice(0, 160),
      startsAt: new Date(c.startTimeSeconds * 1000).toISOString(),
      durationMinutes: Math.round((c.durationSeconds ?? 0) / 60),
      url: `https://codeforces.com/contests/${encodeURIComponent(c.id)}`,
    }));
}

/** LeetCode's upcomingContests (GraphQL) → upcoming contests. */
export function mapLeetcodeContests(list = [], now = Date.now()) {
  return list
    .filter((c) => c.titleSlug && /^[a-z0-9-]+$/.test(c.titleSlug) && c.startTime * 1000 > now)
    .map((c) => ({
      platform: "leetcode",
      id: `lc-${c.titleSlug}`,
      title: String(c.title).slice(0, 160),
      startsAt: new Date(c.startTime * 1000).toISOString(),
      durationMinutes: Math.round((c.duration ?? 0) / 60),
      url: `https://leetcode.com/contest/${c.titleSlug}`,
    }));
}

/** CodeChef's contest list → upcoming contests. */
export function mapCodechefContests(list = [], now = Date.now()) {
  return list
    .map((c) => ({ c, start: validDate(new Date(c.contest_start_date_iso)) }))
    .filter(({ c, start }) => start && start.getTime() > now && /^[A-Za-z0-9_]+$/.test(c.contest_code ?? ""))
    .map(({ c, start }) => ({
      platform: "codechef",
      id: `cc-${c.contest_code}`,
      title: String(c.contest_name).slice(0, 160),
      startsAt: start.toISOString(),
      durationMinutes: Number(c.contest_duration) || 0,
      url: `https://www.codechef.com/${c.contest_code}`,
    }));
}

/** Codeforces problemset.problems → one record per problem (programming problems only). */
export function mapCodeforcesProblems(result) {
  const solved = new Map((result?.problemStatistics ?? []).map((s) => [`${s.contestId}${s.index}`, s.solvedCount ?? 0]));
  return (result?.problems ?? [])
    .filter((p) => p.type === "PROGRAMMING" && p.contestId && p.index && /^[A-Z][0-9]?$/.test(p.index))
    .map((p) => {
      const key = `${p.contestId}${p.index}`;
      return {
        key,
        contestId: p.contestId,
        index: p.index,
        name: String(p.name).slice(0, 200),
        rating: Number.isInteger(p.rating) ? p.rating : null,
        tags: (p.tags ?? []).filter((t) => t !== "*special").slice(0, 12),
        solvedCount: solved.get(key) ?? 0,
        url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
      };
    });
}
