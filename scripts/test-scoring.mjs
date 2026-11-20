/**
 * Unit tests for contest scoring and calendar helpers.
 *   node scripts/test-scoring.mjs
 */
import assert from "node:assert/strict";
import { SERIES, pickProblems, startOf, upcomingNumbers } from "../lib/contests/schedule.js";
import { computeStandings, rankBy } from "../lib/contests/scoring.js";
import { dayStart, monthStartKey, weekStartKey } from "../lib/utils/time.js";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✔ ${name}`);
};

const points = new Map([["A", 100], ["B", 200], ["C", 300]]);

test("score is the sum of solved problems' points", () => {
  const rows = computeStandings(
    [
      { userId: "u1", problemId: "A", status: "accepted", minute: 5 },
      { userId: "u1", problemId: "B", status: "accepted", minute: 20 },
    ],
    points,
  );
  assert.equal(rows[0].score, 300);
  assert.equal(rows[0].solvedCount, 2);
  assert.equal(rows[0].penaltyMinutes, 25);
});

test("wrong attempts add penalty only once the problem is solved", () => {
  const rows = computeStandings(
    [
      { userId: "u1", problemId: "A", status: "wrong_answer", minute: 3 },
      { userId: "u1", problemId: "A", status: "time_limit_exceeded", minute: 6 },
      { userId: "u1", problemId: "A", status: "accepted", minute: 9 },
      { userId: "u1", problemId: "B", status: "wrong_answer", minute: 30 }, // never solved: no penalty
    ],
    points,
  );
  assert.equal(rows[0].score, 100);
  assert.equal(rows[0].penaltyMinutes, 9 + 2 * 10);
  assert.equal(rows[0].submissions, 4);
});

test("compilation errors are not penalised and resubmitting a solved problem changes nothing", () => {
  const rows = computeStandings(
    [
      { userId: "u1", problemId: "A", status: "compilation_error", minute: 1 },
      { userId: "u1", problemId: "A", status: "accepted", minute: 4 },
      { userId: "u1", problemId: "A", status: "accepted", minute: 8 },
      { userId: "u1", problemId: "A", status: "wrong_answer", minute: 9 },
    ],
    points,
  );
  assert.equal(rows[0].score, 100);
  assert.equal(rows[0].penaltyMinutes, 4);
});

test("ranking: score, then penalty, then earlier last accept; ties share a rank", () => {
  const rows = computeStandings(
    [
      { userId: "slow", problemId: "C", status: "accepted", minute: 50 },
      { userId: "fast", problemId: "C", status: "accepted", minute: 10 },
      { userId: "many", problemId: "A", status: "accepted", minute: 1 },
      { userId: "many", problemId: "B", status: "accepted", minute: 2 },
      { userId: "twinA", problemId: "A", status: "accepted", minute: 7 },
      { userId: "twinB", problemId: "A", status: "accepted", minute: 7 },
    ],
    points,
    { participants: ["idle"] },
  );
  // All three 300-point users are ordered by penalty (3, 10, 50); the twins tie; idle is last.
  assert.deepEqual(
    rows.map((r) => `${r.rank}:${r.userId}`),
    ["1:many", "2:fast", "3:slow", "4:twinA", "4:twinB", "6:idle"],
  );
});

test("same score: lower penalty wins even with fewer problems", () => {
  const rows = computeStandings(
    [
      { userId: "fast", problemId: "C", status: "accepted", minute: 10 },
      { userId: "many", problemId: "A", status: "accepted", minute: 1 },
      { userId: "many", problemId: "B", status: "accepted", minute: 2 },
    ],
    points,
  );
  assert.equal(rows[0].userId, "many");
  assert.equal(rows[1].userId, "fast");
});

test("rankBy gives competition ranks", () => {
  const rows = rankBy([{ v: 9 }, { v: 7 }, { v: 7 }, { v: 3 }], (r) => r.v);
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 2, 4]);
});

test("week starts on Monday and month on the 1st (platform calendar)", () => {
  assert.equal(weekStartKey("2026-11-20"), "2026-11-16"); // Friday → Monday
  assert.equal(weekStartKey("2026-11-16"), "2026-11-16"); // Monday stays
  assert.equal(weekStartKey("2026-11-22"), "2026-11-16"); // Sunday → previous Monday
  assert.equal(monthStartKey("2026-11-20"), "2026-11-01");
  assert.equal(dayStart("2026-11-20").toISOString(), "2026-11-19T18:30:00.000Z"); // IST midnight
});

test("schedule: weekly and round start times and the two-week window", () => {
  const [weekly, round] = SERIES;
  assert.equal(startOf(weekly, 1).toISOString(), "2026-11-22T05:00:00.000Z", "Weekly #1 is Sunday 10:30 IST");
  assert.equal(startOf(weekly, 3).toISOString(), "2026-12-06T05:00:00.000Z");
  assert.equal(startOf(round, 2).toISOString(), "2026-12-12T14:30:00.000Z", "rounds are fortnightly");
  const before = Date.UTC(2026, 10, 20);
  assert.deepEqual(upcomingNumbers(weekly, before), [1, 2], "two weeklies within 15 days");
  assert.deepEqual(upcomingNumbers(round, before), [1]);
  // Just after Weekly #1 starts, it's no longer upcoming.
  assert.deepEqual(upcomingNumbers(weekly, startOf(weekly, 1).getTime() + 1), [2, 3]);
  assert.deepEqual(upcomingNumbers(weekly, startOf(weekly, 1).getTime()), [1, 2, 3], "a contest starting this instant counts");
  for (const n of upcomingNumbers(weekly, Date.UTC(2027, 5, 1))) assert.equal(startOf(weekly, n).getUTCDay(), 0, "weeklies always fall on Sunday");
  for (const n of upcomingNumbers(round, Date.UTC(2027, 5, 1))) assert.equal(startOf(round, n).getUTCDay(), 6, "rounds always fall on Saturday");
});

test("schedule: picks problems by difficulty, least recently used, never twice in one contest", () => {
  const pool = [
    ...["e1", "e2", "e3"].map((_id) => ({ _id, difficulty: "easy" })),
    ...["m1", "m2", "m3"].map((_id) => ({ _id, difficulty: "medium" })),
    { _id: "h1", difficulty: "hard" },
  ];
  const slots = [["easy", 300], ["medium", 400], ["medium", 500], ["hard", 600]];
  const lastUsed = new Map([["e1", 5], ["e2", 9], ["m1", 3], ["m2", 1]]);
  const picked = pickProblems(slots, pool, lastUsed, 7);
  assert.equal(picked[0].problemId, "e3", "never-used easy first");
  assert.equal(picked[1].problemId, "m3", "never-used medium first");
  assert.equal(picked[2].problemId, "m2", "then the medium used longest ago");
  assert.deepEqual(picked.map((p) => [p.points, p.position]), [[300, 0], [400, 1], [500, 2], [600, 3]]);
  assert.equal(pickProblems([["hard", 1], ["hard", 2]], pool, new Map(), 1)[1], null, "too few problems leaves a gap");
  // Ties break differently for different contests, but the same seed gives the same pick.
  const fresh = Array.from({ length: 12 }, (_, i) => ({ _id: `p${i}`, difficulty: "easy" }));
  const firsts = new Set([1, 2, 3, 4, 5, 6].map((seed) => pickProblems([["easy", 1]], fresh, new Map(), seed * 7919)[0].problemId));
  assert.ok(firsts.size > 1, "every contest picked the same problem");
  assert.deepEqual(pickProblems(slots, pool, lastUsed, 7), picked);
});

console.log(`\n${passed} scoring tests passed.`);
