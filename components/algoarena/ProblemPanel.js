"use client";

import { AnimatePresence, motion } from "motion/react";
import { Clock, Database, Lightbulb, Loader2, Lock, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import SlidingTabs from "@/components/common/SlidingTabs";
import { SubmissionStatus } from "@/components/dashboard/StatusPill";
import { LANGUAGES } from "@/lib/execution/languages";
import { relativeTime } from "@/lib/utils/time";
import DifficultyBadge from "./DifficultyBadge";

/** Renders `inline code` spans inside plain problem text. */
function Prose({ text }) {
  return (
    <p className="whitespace-pre-line leading-relaxed">
      {String(text ?? "").split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") ? <code key={i} className="rounded bg-page px-1 py-0.5 font-mono text-[0.85em] text-arena-800">{part.slice(1, -1)}</code> : part,
      )}
    </p>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Pre({ children }) {
  return <pre className="overflow-x-auto whitespace-pre rounded-xl border border-line bg-page px-3 py-2 font-mono text-[12.5px] leading-relaxed">{children || " "}</pre>;
}

function Hints({ hints }) {
  const [shown, setShown] = useState(0);
  if (!hints?.length) return <p className="text-sm text-muted">No hints for this problem.</p>;
  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {hints.slice(0, shown).map((hint, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 rounded-xl bg-xp-50 px-3 py-2.5 text-sm text-xp-800">
            <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span><span className="font-medium">Hint {i + 1}.</span> {hint}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {shown < hints.length ? (
        <button
          type="button"
          onClick={() => setShown((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-xp-200 px-3 py-1.5 text-sm text-xp-800 transition-colors hover:bg-xp-50"
        >
          <Lock size={13} aria-hidden="true" /> Reveal hint {shown + 1} of {hints.length}
        </button>
      ) : (
        <p className="text-xs text-muted">That&apos;s every hint. You&apos;ve got this.</p>
      )}
    </div>
  );
}

function Submissions({ problemId, canSubmit, refreshKey, onLoadCode }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });

  useEffect(() => {
    if (!canSubmit) return;
    let cancelled = false;
    fetch(`/api/algoarena/submissions?problemId=${problemId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => !cancelled && setState({ loading: false, items: d.items, error: "" }))
      .catch(() => !cancelled && setState({ loading: false, items: [], error: "Couldn't load your submissions." }));
    return () => {
      cancelled = true;
    };
  }, [problemId, canSubmit, refreshKey]);

  if (!canSubmit) {
    return (
      <p className="text-sm text-muted">
        <Link href="/login" className="text-arena-600 hover:underline">Log in</Link> as a student to submit and see your history.
      </p>
    );
  }
  if (state.loading) return <p className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading…</p>;
  if (state.error) return <p className="text-sm text-danger-600">{state.error}</p>;
  if (!state.items.length) return <p className="text-sm text-muted">No submissions yet. Your attempts will appear here.</p>;

  return (
    <ul className="space-y-1.5">
      {state.items.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => s.code && onLoadCode(s.language, s.code)}
            disabled={!s.code}
            title={s.code ? "Load this code into the editor" : "Sample submission without code"}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-left text-sm transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-arena-200"
          >
            <span className="min-w-0">
              <SubmissionStatus status={s.status} />
              <span className="block text-xs text-muted">
                {LANGUAGES[s.language]?.label} · {relativeTime(s.createdAt)}
                {s.executionMode === "demo" ? " · demo" : ""}
                {s.isSample ? " · sample data" : ""}
              </span>
            </span>
            <span className="shrink-0 text-right text-xs text-muted">
              {s.status !== "not_executed" && <span className="block">{s.passedCount}/{s.totalCount} tests</span>}
              {s.runtimeMs != null && <span className="block">{s.runtimeMs} ms</span>}
              {s.xpAwarded > 0 && <span className="block text-xp-700">+{s.xpAwarded} XP</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function ProblemPanel({ problem, isDaily, canSubmit, refreshKey, onLoadCode }) {
  const [tab, setTab] = useState("description");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-2">
        <SlidingTabs
          className="shadow-none"
          ariaLabel="Problem"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "description", label: "Description" },
            { value: "hints", label: `Hints (${problem.hints?.length ?? 0})` },
            { value: "submissions", label: "Submissions" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            {tab === "description" && (
              <div className="space-y-4 text-sm">
                <div>
                  <h1 className="text-lg font-medium tracking-tight">{problem.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    {problem.topics.map((t) => <span key={t} className="rounded-full bg-arena-50 px-2 py-0.5 text-arena-800">{t}</span>)}
                    {problem.isInterview && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-page px-2 py-0.5 text-muted"><Star size={11} aria-hidden="true" /> Interview</span>
                    )}
                    {isDaily && <span className="rounded-full bg-arena-600 px-2 py-0.5 text-white">Today&apos;s challenge</span>}
                    <span className="rounded-full bg-xp-50 px-2 py-0.5 text-xp-800">+{problem.xpReward} XP</span>
                  </div>
                </div>
                <Prose text={problem.description} />
                <Block title="Input format"><Prose text={problem.inputFormat} /></Block>
                <Block title="Output format"><Prose text={problem.outputFormat} /></Block>
                {problem.constraints && <Block title="Constraints"><Prose text={problem.constraints} /></Block>}
                {problem.samples.map((s, i) => (
                  <Block key={i} title={`Example ${i + 1}`}>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                      <div><div className="mb-1 text-xs text-muted">Input</div><Pre>{s.input}</Pre></div>
                      <div><div className="mb-1 text-xs text-muted">Output</div><Pre>{s.output}</Pre></div>
                    </div>
                    {s.explanation && <p className="mt-1.5 text-xs text-muted">{s.explanation}</p>}
                  </Block>
                ))}
                {(problem.timeComplexity || problem.spaceComplexity) && (
                  <div className="flex flex-wrap gap-4 text-xs text-muted">
                    {problem.timeComplexity && <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" /> Expected time {problem.timeComplexity}</span>}
                    {problem.spaceComplexity && <span className="inline-flex items-center gap-1"><Database size={13} aria-hidden="true" /> Expected space {problem.spaceComplexity}</span>}
                  </div>
                )}
              </div>
            )}
            {tab === "hints" && <Hints hints={problem.hints} />}
            {tab === "submissions" && <Submissions problemId={problem.id} canSubmit={canSubmit} refreshKey={refreshKey} onLoadCode={onLoadCode} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
