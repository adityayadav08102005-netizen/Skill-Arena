"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Pill tab bar with a highlight that slides to the selected tab.
 * Controlled: pass `value` and `onChange`. `tabs` is [{ value, label }].
 */
export default function SlidingTabs({ tabs, value, onChange, className, ariaLabel = "Sections" }) {
  const layoutId = useId();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-full border border-line bg-panel p-1 shadow-float", className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200",
              active ? "text-arena-800" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-arena-50"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
