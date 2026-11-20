"use client";

import { motion } from "motion/react";

const COLORS = {
  arena: ["var(--sa-arena-50)", "var(--sa-arena-600)"],
  xp: ["var(--sa-xp-50)", "var(--sa-xp-400)"],
  bridge: ["var(--sa-bridge-50)", "var(--sa-bridge-400)"],
};

/** Animated circular progress (0–100) with the value in the middle. */
export default function ProgressRing({ percent, size = 64, stroke = 6, tone = "arena", label, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [track, bar] = COLORS[tone] ?? COLORS.arena;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${clamped}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={bar}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c * (1 - clamped / 100) }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 5} fill="var(--sa-ink)">
        {children ?? `${clamped}%`}
      </text>
    </svg>
  );
}
