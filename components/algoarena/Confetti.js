"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

const COLORS = ["#534AB7", "#7F77DD", "#1D9E75", "#EF9F27", "#D85A30"];

/** One-off confetti burst; mount it with a new `burstKey` to fire again. Decorative only. */
export default function Confetti({ burstKey, pieces = 40 }) {
  const parts = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        // Deterministic spread from the index so renders are pure.
        const angle = (i / pieces) * Math.PI * 2 + ((burstKey % 7) * 0.13);
        const distance = 120 + ((i * 37) % 140);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 80,
          rotate: ((i * 53) % 360) - 180,
          color: COLORS[i % COLORS.length],
          size: 6 + (i % 4) * 2,
          round: i % 3 === 0,
        };
      }),
    [burstKey, pieces],
  );

  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-[60]" aria-hidden="true" key={burstKey}>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ width: p.size, height: p.round ? p.size : p.size / 2, backgroundColor: p.color, borderRadius: p.round ? "50%" : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 220], opacity: [1, 1, 0], rotate: p.rotate * 3, scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
