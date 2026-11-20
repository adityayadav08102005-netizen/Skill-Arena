"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const WORK_MODE = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };

/** Recommended opportunities; each row expands to show why it matched and which skills are missing. */
export default function RecommendationList({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <ul className="space-y-1">
      {items.map((r) => {
        const expanded = open === r.id;
        return (
          <li key={r.id} className="rounded-lg transition-colors hover:bg-page">
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : r.id)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted">
                  {r.companyName} · {WORK_MODE[r.workMode] ?? r.workMode}
                  {r.source !== "manual" ? ` · via ${r.source}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className={cn("text-sm font-medium", r.score >= 75 ? "text-bridge-600" : r.score >= 50 ? "text-xp-700" : "text-muted")}>{r.score}%</span>
                <ChevronDown size={14} className={cn("text-muted transition-transform duration-300", expanded && "rotate-180")} aria-hidden="true" />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 px-2 pb-3 text-xs">
                    {r.reasons.length > 0 && <p className="text-muted">{r.reasons.join(" · ")}</p>}
                    <Link href={`/skillbridge/${r.id}`} className="inline-block text-bridge-600 hover:underline">View and apply</Link>
                    <div className="flex flex-wrap gap-1">
                      {r.matchedSkills.map((s) => (
                        <span key={s} className="rounded-md border border-bridge-200 px-1.5 py-0.5 text-bridge-800">{s} ✓</span>
                      ))}
                      {r.missingSkills.map((s) => (
                        <span key={s} className="rounded-md border border-line px-1.5 py-0.5 text-muted">{s}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
