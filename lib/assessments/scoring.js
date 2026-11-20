/**
 * Assessment scoring and proficiency (pure, unit-tested in scripts/test-assessments.mjs).
 *
 * `questions`: [{ id, topic, answer }] in the attempt's order.
 * `answers`:   the student's chosen option index per position (null = unanswered).
 * Unanswered questions count as incorrect. Percentages are whole numbers.
 */
export function scoreAttempt(questions, answers) {
  const topicScores = {};
  const perQuestion = questions.map((q, i) => {
    const chosen = Number.isInteger(answers?.[i]) ? answers[i] : null;
    const correct = chosen !== null && chosen === q.answer;
    const topic = q.topic || "General";
    topicScores[topic] ??= { correct: 0, total: 0 };
    topicScores[topic].total += 1;
    if (correct) topicScores[topic].correct += 1;
    return { id: q.id, chosen, correct, answered: chosen !== null };
  });
  const score = perQuestion.filter((p) => p.correct).length;
  const total = questions.length;
  return {
    score,
    total,
    answered: perQuestion.filter((p) => p.answered).length,
    percentage: total ? Math.round((score / total) * 100) : 0,
    topicScores,
    perQuestion,
  };
}

/** Proficiency band from a best score. */
export function proficiencyFor(percentage) {
  if (percentage === null || percentage === undefined) return null;
  if (percentage >= 90) return { level: "Expert", rank: 4 };
  if (percentage >= 75) return { level: "Advanced", rank: 3 };
  if (percentage >= 50) return { level: "Intermediate", rank: 2 };
  return { level: "Beginner", rank: 1 };
}

/** Profile proficiency (1–5) implied by an assessment score, used for verified skills. */
export function skillProficiencyFromScore(percentage) {
  if (percentage >= 95) return 5;
  if (percentage >= 85) return 4;
  return 3;
}

/** Score needed for an assessment to mark the matching profile skills as verified. */
export const VERIFY_THRESHOLD = 80;

/** Assessment category → profile skill names it can verify. */
export const CATEGORY_SKILLS = {
  python: ["Python"],
  java: ["Java"],
  javascript: ["JavaScript"],
  c_cpp: ["C", "C++"],
  dsa: ["Data Structures", "Algorithms"],
  dbms: ["DBMS"],
  os: ["Operating Systems"],
  cn: ["Computer Networks"],
  oop: ["OOP"],
  aptitude: ["Problem Solving"],
  logical: ["Problem Solving"],
  interview: [],
};

/** Fisher–Yates with an injectable random source (so tests can be deterministic). */
export function shuffle(list, random = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
