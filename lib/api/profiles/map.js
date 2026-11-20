/**
 * Pure mapping of GitHub and Codeforces responses into the small summaries
 * SkillArena stores and shows. No server-only imports (unit-tested with Node).
 */

/** GitHub user + repos → summary. Forks are left out of the language and project lists. */
export function mapGithub(user, repos = []) {
  const own = repos.filter((r) => !r.fork && !r.archived);
  const languages = new Map();
  for (const r of own) if (r.language) languages.set(r.language, (languages.get(r.language) ?? 0) + 1);
  const topLanguages = [...languages.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, repoCount]) => ({ name, repos: repoCount }));
  const featured = [...own]
    .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0) || new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 4)
    .map((r) => ({
      name: String(r.name).slice(0, 100),
      description: r.description ? String(r.description).slice(0, 200) : "",
      language: r.language ?? null,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      url: /^https:\/\/github\.com\//.test(r.html_url ?? "") ? r.html_url : null,
      pushedAt: r.pushed_at ?? null,
    }));
  return {
    login: user.login,
    name: user.name ?? null,
    publicRepos: user.public_repos ?? 0,
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    createdAt: user.created_at ?? null,
    totalStars: own.reduce((s, r) => s + (r.stargazers_count ?? 0), 0),
    topLanguages,
    featured,
    lastPushAt: own.reduce((latest, r) => (r.pushed_at && (!latest || r.pushed_at > latest) ? r.pushed_at : latest), null),
  };
}

/** Codeforces user.info entry + user.rating history → summary (last 20 rated contests kept for the chart). */
export function mapCodeforces(info, history = []) {
  const contests = history.map((h) => ({
    contestId: h.contestId,
    name: String(h.contestName ?? "").slice(0, 120),
    rank: h.rank,
    oldRating: h.oldRating,
    newRating: h.newRating,
    at: h.ratingUpdateTimeSeconds ? new Date(h.ratingUpdateTimeSeconds * 1000).toISOString() : null,
  }));
  const best = contests.reduce((b, c) => (b === null || c.rank < b ? c.rank : b), null);
  return {
    handle: info.handle,
    rating: info.rating ?? null,
    maxRating: info.maxRating ?? null,
    rank: info.rank ?? "unrated",
    maxRank: info.maxRank ?? null,
    contribution: info.contribution ?? 0,
    contestCount: contests.length,
    bestRank: best,
    recent: contests.slice(-20),
  };
}

/** Codeforces' own rank colours, for the rating badge (text stays in ink colours; only the dot is coloured). */
export function codeforcesRankColor(rank = "") {
  const r = rank.toLowerCase();
  if (r.includes("legendary") || r.includes("international grandmaster") || r === "grandmaster") return "#FF0000";
  if (r.includes("master")) return "#FF8C00";
  if (r.includes("candidate")) return "#AA00AA";
  if (r.includes("expert")) return "#0000FF";
  if (r.includes("specialist")) return "#03A89E";
  if (r.includes("pupil")) return "#008000";
  return "#808080";
}
