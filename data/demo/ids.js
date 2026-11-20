/**
 * Stable ObjectId strings (24 hex chars) for sample records, so demo mode and
 * the MongoDB seed share the same ids and relationships. Each group gets its
 * own two-hex prefix, e.g. demoId("problem", 3) → "b0000000000000000000003".
 */
const GROUPS = {
  skill: "11",
  company: "c0",
  problem: "b0",
  assessment: "a0",
  question: "a1",
  opportunity: "d0",
  contest: "e0",
  achievement: "f0",
  user: "90",
  submission: "b1",
  attempt: "a2",
  application: "d1",
};

export function demoId(group, n) {
  const prefix = GROUPS[group];
  if (!prefix) throw new Error(`Unknown demo id group: ${group}`);
  return `${prefix}${String(n).padStart(22, "0")}`;
}
