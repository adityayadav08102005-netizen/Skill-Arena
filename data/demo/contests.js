import { problemBySlug } from "../problems/index.js";
import { demoId } from "./ids.js";

/**
 * Sample contests. Start times are offsets in hours from "now" so there is
 * always one finished, one upcoming soon and one later contest.
 */
const RAW = [
  {
    slug: "weekly-arena-40",
    title: "Weekly Arena #40",
    description: "Four problems from easy to hard. Wrong attempts add a 10-minute penalty.",
    startsInHours: -24 * 7,
    durationMinutes: 90,
    problems: [
      ["valid-parentheses", 100],
      ["merge-intervals", 200],
      ["coin-change", 300],
      ["edit-distance", 400],
    ],
  },
  {
    slug: "weekly-arena-42",
    title: "Weekly Arena #42",
    description: "Four problems from easy to hard. Wrong attempts add a 10-minute penalty.",
    startsInHours: 50,
    durationMinutes: 90,
    problems: [
      ["binary-search", 100],
      ["kth-largest-element", 200],
      ["number-of-islands", 300],
      ["network-delay-time", 400],
    ],
  },
  {
    slug: "monthly-code-sprint-november",
    title: "Monthly code sprint",
    description: "A longer contest with a mix of graph, DP and greedy problems.",
    startsInHours: 24 * 9,
    durationMinutes: 150,
    problems: [
      ["jump-game", 150],
      ["binary-tree-level-order", 200],
      ["longest-substring-without-repeating-characters", 250],
      ["n-queens-count", 400],
    ],
  },
];

export const PENALTY_MINUTES_PER_WRONG = 10;

export const contests = RAW.map(({ problems, ...c }, i) => ({
  id: demoId("contest", i + 1),
  ...c,
  problems: problems.map(([slug, points], position) => ({
    problemId: problemBySlug[slug].id,
    points,
    position,
  })),
}));
