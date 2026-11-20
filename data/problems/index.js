import { demoId } from "../demo/ids.js";
import { EXTRA_RAW } from "./extra.js";

/**
 * AlgoArena problem catalogue. Every problem uses plain stdin/stdout so the
 * same tests work for Python, Java, C++ and JavaScript under Judge0.
 * `samples` are shown to students; `hiddenTests` are only ever read on the server.
 */
export const XP_BY_DIFFICULTY = { easy: 10, medium: 30, hard: 50 };

const RAW = [
  {
    slug: "two-sum",
    title: "Two sum",
    difficulty: "easy",
    topics: ["Arrays", "Hashing"],
    concepts: ["Hash map lookups"],
    isInterview: true,
    description:
      "Given an array of integers and a target, print the indices of the two numbers that add up to the target. Exactly one valid pair exists, and you may not use the same element twice.",
    inputFormat: "Line 1: n. Line 2: n space-separated integers. Line 3: the target.",
    outputFormat: "Two 0-based indices i and j with i < j, separated by a space.",
    constraints: "2 ≤ n ≤ 10^5, −10^9 ≤ values, target ≤ 10^9",
    samples: [
      { input: "4\n2 7 11 15\n9", output: "0 1", explanation: "2 + 7 = 9, so indices 0 and 1." },
      { input: "3\n3 2 4\n6", output: "1 2", explanation: "2 + 4 = 6." },
    ],
    hiddenTests: [
      { input: "2\n3 3\n6", output: "0 1" },
      { input: "5\n-1 -2 -3 -4 -5\n-8", output: "2 4" },
    ],
    hints: [
      "For each number, what other value would complete the target?",
      "Store values you have already seen in a hash map from value to index.",
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  {
    slug: "valid-parentheses",
    title: "Valid parentheses",
    difficulty: "easy",
    topics: ["Stacks", "Strings"],
    concepts: ["Stack matching"],
    isInterview: true,
    description:
      "Given a string containing only the characters ()[]{} decide whether every bracket is closed by the same type of bracket in the correct order.",
    inputFormat: "A single line with the bracket string.",
    outputFormat: "true or false",
    constraints: "1 ≤ length ≤ 10^4",
    samples: [
      { input: "()[]{}", output: "true", explanation: "Each pair closes immediately." },
      { input: "(]", output: "false", explanation: "( is closed by ], which is the wrong type." },
    ],
    hiddenTests: [
      { input: "([{}])", output: "true" },
      { input: "(((", output: "false" },
      { input: "{[]}()", output: "true" },
    ],
    hints: ["Push opening brackets onto a stack.", "A closing bracket must match the top of the stack."],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse a linked list",
    difficulty: "easy",
    topics: ["Linked Lists"],
    concepts: ["Pointer manipulation"],
    isInterview: true,
    description:
      "Build a singly linked list from the given values, reverse it in place, and print the values of the reversed list.",
    inputFormat: "Line 1: n. Line 2: n space-separated integers (empty when n is 0).",
    outputFormat: "The reversed values separated by spaces (an empty line when n is 0).",
    constraints: "0 ≤ n ≤ 5000",
    samples: [
      { input: "5\n1 2 3 4 5", output: "5 4 3 2 1", explanation: "The links are reversed one node at a time." },
      { input: "2\n1 2", output: "2 1", explanation: "" },
    ],
    hiddenTests: [
      { input: "1\n7", output: "7" },
      { input: "0\n", output: "" },
    ],
    hints: ["Keep three pointers: previous, current and next.", "Point current.next at previous, then advance."],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  {
    slug: "binary-search",
    title: "Binary search",
    difficulty: "easy",
    topics: ["Searching", "Arrays"],
    concepts: ["Divide and conquer"],
    isInterview: false,
    description: "Given a sorted array of distinct integers and a target, print the index of the target or −1 if it is absent.",
    inputFormat: "Line 1: n. Line 2: n sorted integers. Line 3: the target.",
    outputFormat: "The index of the target, or -1.",
    constraints: "1 ≤ n ≤ 10^4",
    samples: [
      { input: "6\n-1 0 3 5 9 12\n9", output: "4", explanation: "9 is at index 4." },
      { input: "6\n-1 0 3 5 9 12\n2", output: "-1", explanation: "2 is not in the array." },
    ],
    hiddenTests: [
      { input: "1\n5\n5", output: "0" },
      { input: "5\n1 3 5 7 9\n1", output: "0" },
    ],
    hints: ["Compare the target with the middle element.", "Discard the half that cannot contain the target."],
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
  },
  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest substring without repeating characters",
    difficulty: "medium",
    topics: ["Strings", "Sliding Window"],
    concepts: ["Two pointers", "Hash map"],
    isInterview: true,
    description: "Given a string s, print the length of the longest substring that contains no repeated characters.",
    inputFormat: "A single line with the string s (may be empty).",
    outputFormat: "A single integer.",
    constraints: "0 ≤ |s| ≤ 5·10^4",
    samples: [
      { input: "abcabcbb", output: "3", explanation: "\"abc\" has length 3." },
      { input: "bbbbb", output: "1", explanation: "\"b\" has length 1." },
    ],
    hiddenTests: [
      { input: "pwwkew", output: "3" },
      { input: "", output: "0" },
      { input: "dvdf", output: "3" },
    ],
    hints: [
      "Grow a window to the right while characters stay unique.",
      "Remember the last index of each character to jump the left edge.",
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(k)",
  },
  {
    slug: "merge-intervals",
    title: "Merge intervals",
    difficulty: "medium",
    topics: ["Sorting", "Arrays"],
    concepts: ["Sort then sweep"],
    isInterview: true,
    description:
      "Merge all overlapping intervals and print the result sorted by start. Intervals that touch (end equals the next start) also merge.",
    inputFormat: "Line 1: n. Next n lines: start and end of an interval.",
    outputFormat: "One merged interval per line as `start end`.",
    constraints: "1 ≤ n ≤ 10^4, 0 ≤ start ≤ end ≤ 10^4",
    samples: [
      { input: "4\n1 3\n2 6\n8 10\n15 18", output: "1 6\n8 10\n15 18", explanation: "[1,3] and [2,6] overlap." },
      { input: "2\n1 4\n4 5", output: "1 5", explanation: "Touching intervals merge." },
    ],
    hiddenTests: [
      { input: "3\n5 7\n1 2\n2 4", output: "1 4\n5 7" },
      { input: "1\n0 0", output: "0 0" },
    ],
    hints: ["Sort by start first.", "Extend the last merged interval while the next one starts before it ends."],
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
  },
  {
    slug: "kth-largest-element",
    title: "Kth largest element",
    difficulty: "medium",
    topics: ["Sorting", "Heaps"],
    concepts: ["Min-heap of size k", "Quickselect"],
    isInterview: true,
    description: "Print the kth largest element of the array (by sorted order, not distinct values).",
    inputFormat: "Line 1: n and k. Line 2: n integers.",
    outputFormat: "A single integer.",
    constraints: "1 ≤ k ≤ n ≤ 10^5",
    samples: [
      { input: "6 2\n3 2 1 5 6 4", output: "5", explanation: "Sorted descending: 6 5 4 3 2 1." },
      { input: "9 4\n3 2 3 1 2 4 5 5 6", output: "4", explanation: "Sorted descending: 6 5 5 4 …" },
    ],
    hiddenTests: [
      { input: "1 1\n7", output: "7" },
      { input: "5 5\n2 9 -1 4 4", output: "-1" },
    ],
    hints: ["Sorting works but is O(n log n).", "A min-heap holding k elements keeps the answer on top."],
    timeComplexity: "O(n log k)",
    spaceComplexity: "O(k)",
  },
  {
    slug: "number-of-islands",
    title: "Number of islands",
    difficulty: "medium",
    topics: ["Graphs", "Recursion"],
    concepts: ["DFS", "BFS", "Flood fill"],
    isInterview: true,
    description:
      "A grid contains 1 for land and 0 for water. Count the islands, where an island is land connected horizontally or vertically.",
    inputFormat: "Line 1: rows r and columns c. Next r lines: a string of c characters, each 0 or 1.",
    outputFormat: "The number of islands.",
    constraints: "1 ≤ r, c ≤ 300",
    samples: [
      { input: "4 5\n11110\n11010\n11000\n00000", output: "1", explanation: "All land cells connect." },
      { input: "4 5\n11000\n11000\n00100\n00011", output: "3", explanation: "Three separate groups." },
    ],
    hiddenTests: [
      { input: "1 1\n0", output: "0" },
      { input: "3 3\n101\n010\n101", output: "5" },
    ],
    hints: ["Scan every cell; start a search from each unvisited land cell.", "Mark cells as visited as you flood them."],
    timeComplexity: "O(r·c)",
    spaceComplexity: "O(r·c)",
  },
  {
    slug: "coin-change",
    title: "Coin change",
    difficulty: "medium",
    topics: ["Dynamic Programming"],
    concepts: ["Unbounded knapsack"],
    isInterview: true,
    description:
      "Given coin denominations and an amount, print the fewest coins that make up the amount, or −1 if it cannot be made. You have unlimited coins of each type.",
    inputFormat: "Line 1: number of coin types n and the amount. Line 2: n coin values.",
    outputFormat: "A single integer.",
    constraints: "1 ≤ n ≤ 12, 0 ≤ amount ≤ 10^4",
    samples: [
      { input: "3 11\n1 2 5", output: "3", explanation: "11 = 5 + 5 + 1." },
      { input: "1 3\n2", output: "-1", explanation: "Odd amounts cannot be made from 2s." },
    ],
    hiddenTests: [
      { input: "1 0\n1", output: "0" },
      { input: "4 6\n1 3 4 5", output: "2" },
      { input: "2 7\n2 4", output: "-1" },
    ],
    hints: ["Let dp[a] be the fewest coins for amount a.", "dp[a] = 1 + min(dp[a − coin]) over all coins."],
    timeComplexity: "O(n·amount)",
    spaceComplexity: "O(amount)",
  },
  {
    slug: "binary-tree-level-order",
    title: "Binary tree level order traversal",
    difficulty: "medium",
    topics: ["Trees", "Queues"],
    concepts: ["BFS"],
    isInterview: true,
    description:
      "A binary tree is given in level order, with `null` for missing children. Print the node values level by level, one level per line.",
    inputFormat: "A single line of space-separated values or null (empty for an empty tree).",
    outputFormat: "One line per level with values separated by spaces.",
    constraints: "0 ≤ nodes ≤ 2000",
    samples: [
      { input: "3 9 20 null null 15 7", output: "3\n9 20\n15 7", explanation: "Three levels." },
      { input: "1", output: "1", explanation: "" },
    ],
    hiddenTests: [
      { input: "", output: "" },
      { input: "1 2 3 4 null null 5", output: "1\n2 3\n4 5" },
    ],
    hints: ["Use a queue.", "Process the queue one level at a time by recording its size."],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  {
    slug: "jump-game",
    title: "Jump game",
    difficulty: "medium",
    topics: ["Greedy Algorithms", "Arrays"],
    concepts: ["Greedy reach"],
    isInterview: true,
    description:
      "Each element is your maximum jump length from that position. Starting at index 0, decide whether you can reach the last index.",
    inputFormat: "Line 1: n. Line 2: n non-negative integers.",
    outputFormat: "true or false",
    constraints: "1 ≤ n ≤ 10^4",
    samples: [
      { input: "5\n2 3 1 1 4", output: "true", explanation: "Jump 1 to index 1, then 3 to the end." },
      { input: "5\n3 2 1 0 4", output: "false", explanation: "Every path stops at index 3." },
    ],
    hiddenTests: [
      { input: "1\n0", output: "true" },
      { input: "3\n1 0 1", output: "false" },
    ],
    hints: ["Track the furthest index reachable so far.", "If you stand beyond the furthest reach, you are stuck."],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  {
    slug: "edit-distance",
    title: "Edit distance",
    difficulty: "hard",
    topics: ["Dynamic Programming", "Strings"],
    concepts: ["2D DP"],
    isInterview: true,
    description:
      "Print the minimum number of insertions, deletions and replacements needed to turn word1 into word2.",
    inputFormat: "Line 1: word1. Line 2: word2.",
    outputFormat: "A single integer.",
    constraints: "1 ≤ lengths ≤ 500, lowercase letters",
    samples: [
      { input: "horse\nros", output: "3", explanation: "horse → rorse → rose → ros." },
      { input: "intention\nexecution", output: "5", explanation: "" },
    ],
    hiddenTests: [
      { input: "abc\nabc", output: "0" },
      { input: "kitten\nsitting", output: "3" },
    ],
    hints: [
      "dp[i][j] is the distance between the first i letters of word1 and the first j of word2.",
      "If the letters match, dp[i][j] = dp[i−1][j−1]; otherwise take 1 + the best of three moves.",
    ],
    timeComplexity: "O(m·n)",
    spaceComplexity: "O(m·n)",
  },
  {
    slug: "n-queens-count",
    title: "N-Queens count",
    difficulty: "hard",
    topics: ["Recursion", "Backtracking"],
    concepts: ["Backtracking with pruning"],
    isInterview: false,
    description: "Print how many ways n queens can be placed on an n × n board so that no two attack each other.",
    inputFormat: "A single integer n.",
    outputFormat: "The number of distinct solutions.",
    constraints: "1 ≤ n ≤ 10",
    samples: [
      { input: "4", output: "2", explanation: "There are two arrangements on a 4 × 4 board." },
      { input: "1", output: "1", explanation: "" },
    ],
    hiddenTests: [
      { input: "6", output: "4" },
      { input: "8", output: "92" },
    ],
    hints: ["Place one queen per row.", "Track used columns and both diagonals in sets."],
    timeComplexity: "O(n!)",
    spaceComplexity: "O(n)",
  },
  {
    slug: "network-delay-time",
    title: "Network delay time",
    difficulty: "hard",
    topics: ["Graphs", "Greedy Algorithms"],
    concepts: ["Dijkstra's algorithm"],
    isInterview: true,
    description:
      "A signal is sent from node k across n nodes linked by directed, weighted edges. Print the time for every node to receive it, or −1 if some node never does.",
    inputFormat: "Line 1: n, m and k. Next m lines: u v w for an edge from u to v taking w time.",
    outputFormat: "A single integer.",
    constraints: "1 ≤ n ≤ 100, 1 ≤ m ≤ 6000, 0 ≤ w ≤ 100",
    samples: [
      { input: "4 3 2\n2 1 1\n2 3 1\n3 4 1", output: "2", explanation: "Node 4 is reached last, at time 2." },
      { input: "2 1 2\n1 2 1", output: "-1", explanation: "Node 1 is unreachable from node 2." },
    ],
    hiddenTests: [
      { input: "2 1 1\n1 2 1", output: "1" },
      { input: "3 3 1\n1 2 4\n1 3 1\n3 2 2", output: "3" },
    ],
    hints: ["Run Dijkstra from k.", "The answer is the largest shortest-path distance."],
    timeComplexity: "O(m log n)",
    spaceComplexity: "O(n + m)",
  },
];

// New problems are appended after the original 14 so existing ids never change.
export const problems = [...RAW, ...EXTRA_RAW].map((p, i) => ({
  id: demoId("problem", i + 1),
  xpReward: XP_BY_DIFFICULTY[p.difficulty],
  ...p,
}));

export const problemBySlug = Object.fromEntries(problems.map((p) => [p.slug, p]));

export const PROBLEM_TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Stacks",
  "Queues",
  "Searching",
  "Sorting",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Recursion",
  "Greedy Algorithms",
  "Hashing",
  "Heaps",
  "Sliding Window",
  "Backtracking",
];
