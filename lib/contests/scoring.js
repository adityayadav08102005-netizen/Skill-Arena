/**
 * Contest scoring (pure, so it can be unit-tested without a database).
 *
 * Rules, ICPC-style with weighted problems:
 *  - A problem scores its points the first time it is accepted.
 *  - Penalty for a solved problem = minutes from contest start to that accept
 *    + `penaltyPerWrong` × wrong attempts before it. Unsolved problems add no penalty.
 *  - Compilation errors and runner errors are not counted as wrong attempts.
 *  - Ranking: higher score first, then lower penalty, then earlier last accept;
 *    equal on all three share a rank (1, 2, 2, 4).
 *
 * `submissions`: [{ userId, problemId, status, minute }] in submission order.
 * `points`: Map(problemId → points). Returns rows sorted by rank.
 */
const NOT_PENALISED = new Set(["compilation_error", "internal_error", "not_executed", "pending"]);

export function computeStandings(submissions, points, { penaltyPerWrong = 10, participants = [] } = {}) {
  const byUser = new Map();
  const row = (userId) => {
    if (!byUser.has(userId)) byUser.set(userId, { userId, score: 0, penaltyMinutes: 0, solvedCount: 0, submissions: 0, lastAcceptMinute: 0, problems: {} });
    return byUser.get(userId);
  };
  for (const id of participants) row(String(id));

  for (const s of submissions) {
    const r = row(String(s.userId));
    const pid = String(s.problemId);
    const p = (r.problems[pid] ??= { solved: false, wrong: 0, minute: null, points: 0 });
    if (!NOT_PENALISED.has(s.status)) r.submissions += 1;
    if (p.solved) continue; // later attempts after solving don't matter
    if (s.status === "accepted") {
      const value = points.get(pid) ?? 0;
      p.solved = true;
      p.minute = s.minute;
      p.points = value;
      r.score += value;
      r.solvedCount += 1;
      r.penaltyMinutes += s.minute + penaltyPerWrong * p.wrong;
      r.lastAcceptMinute = Math.max(r.lastAcceptMinute, s.minute);
    } else if (!NOT_PENALISED.has(s.status)) {
      p.wrong += 1;
    }
  }

  const rows = [...byUser.values()].sort(
    (a, b) => b.score - a.score || a.penaltyMinutes - b.penaltyMinutes || a.lastAcceptMinute - b.lastAcceptMinute || a.userId.localeCompare(b.userId),
  );
  let rank = 0;
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    const tied = prev && prev.score === r.score && prev.penaltyMinutes === r.penaltyMinutes && prev.lastAcceptMinute === r.lastAcceptMinute;
    if (!tied) rank = i + 1;
    r.rank = rank;
  });
  return rows;
}

/** Competition ranking (1, 2, 2, 4) for an already-sorted list, by a value getter. */
export function rankBy(rows, value) {
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || value(rows[i - 1]) !== value(r)) rank = i + 1;
    return { ...r, rank };
  });
}
