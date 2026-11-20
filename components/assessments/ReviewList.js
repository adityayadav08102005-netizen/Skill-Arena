"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Lightbulb, MinusCircle, XCircle } from "lucide-react";
import { useState } from "react";
import ReportButton from "@/components/common/ReportButton";
import SlidingTabs from "@/components/common/SlidingTabs";
import { cn } from "@/lib/utils/cn";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Correct and incorrect answer review with explanations. */
export default function ReviewList({ questions, canReport = true }) {
  const [filter, setFilter] = useState("all");
  const counts = { all: questions.length, correct: questions.filter((q) => q.correct).length };
  counts.incorrect = counts.all - counts.correct;
  const shown = questions.map((q, i) => ({ ...q, n: i + 1 })).filter((q) => filter === "all" || (filter === "correct" ? q.correct : !q.correct));

  return (
    <div className="space-y-3">
      <SlidingTabs
        ariaLabel="Filter answers"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: "all", label: `All · ${counts.all}` },
          { value: "correct", label: `Correct · ${counts.correct}` },
          { value: "incorrect", label: `Incorrect · ${counts.incorrect}` },
        ]}
      />
      <ol className="space-y-3">
        <AnimatePresence initial={false}>
          {shown.map((q) => (
            <motion.li key={q.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-card border border-line bg-panel p-4">
              <div className="flex items-start gap-2">
                {q.correct ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-bridge-600" aria-label="Correct" />
                ) : q.chosen === null ? (
                  <MinusCircle size={18} className="mt-0.5 shrink-0 text-muted" aria-label="Not answered" />
                ) : (
                  <XCircle size={18} className="mt-0.5 shrink-0 text-danger-600" aria-label="Incorrect" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-muted">Question {q.n}{q.topic ? ` · ${q.topic}` : ""}{q.chosen === null ? " · not answered" : ""}</div>
                    {canReport && q.options.length > 0 && <ReportButton entityType="question" entityId={q.id} what="question" compact />}
                  </div>
                  <p className="mt-0.5 text-sm font-medium leading-relaxed">{q.prompt}</p>
                  <ul className="mt-3 space-y-1.5">
                    {q.options.map((o, i) => {
                      const right = i === q.answer;
                      const mine = i === q.chosen;
                      return (
                        <li
                          key={i}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                            right ? "border-bridge-200 bg-bridge-50 text-bridge-800" : mine ? "border-danger-50 bg-danger-50 text-danger-800" : "border-line",
                          )}
                        >
                          <span className="flex size-5 shrink-0 items-center justify-center rounded text-[11px]">{LETTERS[i]}</span>
                          <span className="flex-1">{o}</span>
                          {right && <span className="text-[11px]">Correct answer</span>}
                          {mine && !right && <span className="text-[11px]">Your answer</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && (
                    <p className="mt-3 flex gap-2 rounded-lg bg-xp-50 px-3 py-2 text-sm text-xp-800">
                      <Lightbulb size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {!shown.length && <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-muted">Nothing here.</p>}
    </div>
  );
}
