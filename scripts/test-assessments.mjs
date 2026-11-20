/**
 * Unit tests for assessment scoring and the question bank.
 *   node scripts/test-assessments.mjs
 */
import assert from "node:assert/strict";
import { ASSESSMENT_CATEGORIES, assessments, questions } from "../data/assessments/index.js";
import { CATEGORY_SKILLS, proficiencyFor, scoreAttempt, shuffle, skillProficiencyFromScore } from "../lib/assessments/scoring.js";
import { skills } from "../data/demo/skills.js";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✔ ${name}`);
};

const qs = [
  { id: "q1", topic: "Keys", answer: 1 },
  { id: "q2", topic: "Keys", answer: 0 },
  { id: "q3", topic: "SQL", answer: 2 },
  { id: "q4", topic: "SQL", answer: 3 },
];

test("counts correct answers and percentage", () => {
  const r = scoreAttempt(qs, [1, 0, 2, 0]);
  assert.equal(r.score, 3);
  assert.equal(r.total, 4);
  assert.equal(r.percentage, 75);
  assert.equal(r.answered, 4);
});

test("unanswered and out-of-range answers count as wrong", () => {
  const r = scoreAttempt(qs, [null, undefined, 2]);
  assert.equal(r.score, 1);
  assert.equal(r.answered, 1);
  assert.deepEqual(r.perQuestion.map((p) => p.correct), [false, false, true, false]);
  assert.equal(scoreAttempt(qs, ["1", 0.5, 2, 3]).score, 2, "non-integer answers are ignored");
});

test("topic-wise scores", () => {
  const r = scoreAttempt(qs, [1, 1, 2, 3]);
  assert.deepEqual(r.topicScores, { Keys: { correct: 1, total: 2 }, SQL: { correct: 2, total: 2 } });
});

test("percentages round to whole numbers", () => {
  assert.equal(scoreAttempt(qs.slice(0, 3), [1, 0, 0]).percentage, 67);
});

test("proficiency bands", () => {
  assert.equal(proficiencyFor(95).level, "Expert");
  assert.equal(proficiencyFor(80).level, "Advanced");
  assert.equal(proficiencyFor(60).level, "Intermediate");
  assert.equal(proficiencyFor(10).level, "Beginner");
  assert.equal(proficiencyFor(null), null);
  assert.equal(skillProficiencyFromScore(100), 5);
  assert.equal(skillProficiencyFromScore(80), 3);
});

test("shuffle keeps every item exactly once", () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = shuffle([1, 2, 3, 4, 5, 6], random);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5, 6]);
});

test("question bank: every category has enough valid questions", () => {
  for (const c of ASSESSMENT_CATEGORIES) {
    const bank = questions.filter((q) => q.category === c.key);
    const a = assessments.find((x) => x.category === c.key);
    assert.ok(bank.length >= a.questionCount, `${c.key} has ${bank.length} questions`);
    for (const q of bank) {
      assert.ok(q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length, `bad answer index: ${q.prompt}`);
      assert.equal(new Set(q.options).size, q.options.length, `duplicate options: ${q.prompt}`);
      assert.ok(q.explanation, `missing explanation: ${q.prompt}`);
    }
  }
});

test("verifiable skills exist in the skill catalogue", () => {
  const names = new Set(skills.map((s) => s.name));
  for (const list of Object.values(CATEGORY_SKILLS)) for (const s of list) assert.ok(names.has(s), `${s} missing from skills`);
});

console.log(`\n${passed} assessment tests passed.`);
