/* Pure schedule maths for the recurring contests (no database), so scripts/test-scoring.mjs can test it. */

/**
 * Recurring contests, created automatically so the Contests page always has
 * something coming up:
 *  - SkillArena Weekly (LeetCode style): Sundays 10:30 IST, 90 minutes,
 *    4 problems (easy, medium, medium, hard), 5-minute penalty.
 *  - SkillArena Round, Div. 2 (Codeforces style): every other Saturday 20:00 IST,
 *    2 hours, problems A–E worth 500–2500, 10-minute penalty.
 * Each contest's slug is derived from its number, so creating them is
 * idempotent: running this twice never makes duplicates.
 */
export const SERIES = [
  {
    key: "weekly",
    title: (n) => `SkillArena Weekly #${n}`,
    slug: (n) => `weekly-${n}`,
    description: "Four problems from easy to hard in 90 minutes, LeetCode Weekly style. Each wrong submission adds a 5-minute penalty; ties break on time.",
    // Weekly #1 is Sunday 22 Nov 2026, 05:00 UTC (10:30 IST); then every 7 days.
    epoch: Date.UTC(2026, 10, 22, 5, 0),
    everyDays: 7,
    durationMinutes: 90,
    penaltyMinutesPerWrong: 5,
    slots: [["easy", 300], ["medium", 400], ["medium", 500], ["hard", 600]],
  },
  {
    key: "round",
    title: (n) => `SkillArena Round #${n} (Div. 2)`,
    slug: (n) => `round-${n}`,
    description: "Codeforces-style round: problems A to E with rising points over two hours. Each wrong submission adds a 10-minute penalty.",
    // Round #1 is Saturday 28 Nov 2026, 14:30 UTC (20:00 IST); then every 14 days.
    epoch: Date.UTC(2026, 10, 28, 14, 30),
    everyDays: 14,
    durationMinutes: 120,
    penaltyMinutesPerWrong: 10,
    slots: [["easy", 500], ["easy", 1000], ["medium", 1500], ["medium", 2000], ["hard", 2500]],
  },
];

const DAY = 86_400_000;
const AHEAD_MS = 15 * DAY; // keep two weeks of contests scheduled

/** Contest numbers (1-based) of this series starting between now and now + ahead. */
export function upcomingNumbers(series, now = Date.now(), ahead = AHEAD_MS) {
  const period = series.everyDays * DAY;
  const first = Math.max(1, Math.ceil((now - series.epoch) / period) + 1);
  const out = [];
  for (let n = first; series.epoch + (n - 1) * period <= now + ahead; n += 1) out.push(n);
  return out;
}

export function startOf(series, n) {
  return new Date(series.epoch + (n - 1) * series.everyDays * DAY);
}

/**
 * Picks problems for one contest: for each slot, the matching-difficulty
 * problem used least recently in any contest (never-used first), so rounds
 * rotate through the whole pool. `seed` breaks ties differently per contest.
 */
export function pickProblems(slots, pool, lastUsed, seed) {
  const taken = new Set();
  return slots.map(([difficulty, points], position) => {
    const candidates = pool
      .filter((p) => p.difficulty === difficulty && !taken.has(String(p._id)))
      .sort((a, b) => (lastUsed.get(String(a._id)) ?? 0) - (lastUsed.get(String(b._id)) ?? 0) || hash(`${seed}:${a._id}`) - hash(`${seed}:${b._id}`));
    const chosen = candidates[0];
    if (!chosen) return null;
    taken.add(String(chosen._id));
    return { problemId: chosen._id, points, position };
  });
}

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 1_000_003;
  return h;
}
