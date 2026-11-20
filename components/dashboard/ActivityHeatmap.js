"use client";

import { motion } from "motion/react";
import { useState } from "react";

// Sequential scale: one hue (AlgoArena violet), light → dark. Zero uses the neutral line color.
const STEPS = ["var(--sa-line)", "var(--sa-arena-200)", "var(--sa-arena-300)", "var(--sa-arena-400)", "var(--sa-arena-600)"];
const level = (n) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
const fmt = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Submissions per day as a week-column grid (oldest left). Hover a cell for its count. */
export default function ActivityHeatmap({ days }) {
  const [hover, setHover] = useState(null);
  // Pad the start so columns are whole weeks (Mon–Sun).
  const firstDow = (new Date(`${days[0].day}T00:00:00`).getDay() + 6) % 7;
  const cells = [...Array(firstDow).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label={`${total} submissions over the last ${weeks.length} weeks`}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d, di) =>
              d ? (
                <motion.span
                  key={d.day}
                  initial={{ opacity: 0, scale: 0.4 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: wi * 0.02 }}
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  className="block size-3 rounded-[3px] transition-transform duration-150 hover:scale-150 hover:ring-2 hover:ring-panel"
                  style={{ backgroundColor: STEPS[level(d.count)] }}
                />
              ) : (
                <span key={`pad-${di}`} className="block size-3" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
        <span aria-live="polite" className="min-h-4">
          {hover ? `${fmt(hover.day)}: ${hover.count} submission${hover.count === 1 ? "" : "s"}` : `${total} submissions in ${weeks.length} weeks`}
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Less
          {STEPS.map((c) => <span key={c} className="block size-2.5 rounded-[3px]" style={{ backgroundColor: c }} />)}
          More
        </span>
      </div>
    </div>
  );
}
