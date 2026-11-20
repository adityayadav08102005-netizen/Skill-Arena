"use client";

import { motion } from "motion/react";

// Categorical (identity) palette, validated for colour-blind separation. Amber is
// low-contrast on white, so every segment also has a text label in the legend.
const SEGMENTS = [
  { key: "easy", label: "Easy", color: "#1D9E75" },
  { key: "medium", label: "Medium", color: "#EF9F27" },
  { key: "hard", label: "Hard", color: "#D85A30" },
];

/** Solved problems split by difficulty: one segmented bar with 2px gaps plus a labelled legend. */
export default function DifficultyBar({ counts }) {
  const total = SEGMENTS.reduce((s, x) => s + (counts[x.key] ?? 0), 0);
  return (
    <div>
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-page" role="img" aria-label={SEGMENTS.map((s) => `${s.label} ${counts[s.key] ?? 0}`).join(", ")}>
        {total > 0 &&
          SEGMENTS.filter((s) => counts[s.key] > 0).map((s, i) => (
            <motion.span
              key={s.key}
              title={`${s.label}: ${counts[s.key]}`}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: s.color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(counts[s.key] / total) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.label} <span className="font-medium text-ink">{counts[s.key] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
