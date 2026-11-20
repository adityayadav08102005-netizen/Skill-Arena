"use client";

import { motion } from "motion/react";
import { useState } from "react";

/** Share of each topic's problems the student has solved. Single hue (magnitude), value as text. */
export default function TopicProgress({ topics, initial = 6 }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? topics : topics.slice(0, initial);
  return (
    <div>
      <ul className="space-y-2.5">
        {shown.map((t, i) => (
          <li key={t.topic} className="group grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
            <span className="truncate transition-colors group-hover:text-arena-800">{t.topic}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-arena-50">
              <motion.span
                className="block h-full rounded-full bg-arena-600"
                initial={{ width: 0 }}
                whileInView={{ width: `${t.percent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </span>
            <span className="text-right text-xs text-muted" title={`${t.solved} of ${t.total} problems solved`}>
              {t.solved}/{t.total}
            </span>
          </li>
        ))}
      </ul>
      {topics.length > initial && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-3 text-xs text-arena-600 hover:underline">
          {expanded ? "Show fewer topics" : `Show all ${topics.length} topics`}
        </button>
      )}
    </div>
  );
}
