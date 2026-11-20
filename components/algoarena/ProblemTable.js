"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleDashed, Search, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import DifficultyBadge from "./DifficultyBadge";

const DIFFICULTIES = ["easy", "medium", "hard"];
const STATUSES = [
  ["all", "All"],
  ["todo", "To do"],
  ["attempted", "Attempted"],
  ["solved", "Solved"],
];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-sm transition-all duration-200 hover:-translate-y-0.5",
        active ? "bg-arena-50 text-arena-800" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Filterable problem list: search, difficulty, topic, status and interview-only. */
export default function ProblemTable({ problems, signedIn }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState(null);
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("all");
  const [interviewOnly, setInterviewOnly] = useState(false);

  const topics = useMemo(() => [...new Set(problems.flatMap((p) => p.topics))].sort(), [problems]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter(
      (p) =>
        (!q || p.title.toLowerCase().includes(q) || p.topics.some((t) => t.toLowerCase().includes(q)) || p.concepts.some((c) => c.toLowerCase().includes(q))) &&
        (!difficulty || p.difficulty === difficulty) &&
        (!topic || p.topics.includes(topic)) &&
        (status === "all" || p.status === status) &&
        (!interviewOnly || p.isInterview),
    );
  }, [problems, query, difficulty, topic, status, interviewOnly]);

  const reset = () => {
    setQuery("");
    setDifficulty(null);
    setTopic("");
    setStatus("all");
    setInterviewOnly(false);
  };

  return (
    <section className="space-y-3">
      <div className="sticky top-16 z-30 flex flex-wrap items-center gap-1 rounded-[20px] border border-line bg-panel/95 p-1.5 shadow-float backdrop-blur-md">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Search problems</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, topic or concept"
            className="h-9 w-full rounded-full bg-page pl-9 pr-3 text-sm outline-none transition-shadow focus:ring-4 focus:ring-arena-50"
          />
        </label>
        <div className="flex items-center" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
              <span className="capitalize">{d}</span>
            </Chip>
          ))}
        </div>
        <label className="sr-only" htmlFor="topic-filter">Topic</label>
        <select id="topic-filter" value={topic} onChange={(e) => setTopic(e.target.value)} className="h-9 rounded-full bg-page px-3 text-sm outline-none">
          <option value="">All topics</option>
          {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {signedIn && (
          <>
            <label className="sr-only" htmlFor="status-filter">Status</label>
            <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-full bg-page px-3 text-sm outline-none">
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </>
        )}
        <Chip active={interviewOnly} onClick={() => setInterviewOnly((v) => !v)}>
          <span className="inline-flex items-center gap-1"><Star size={13} aria-hidden="true" /> Interview</span>
        </Chip>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-panel">
        <div className="hidden grid-cols-[2rem_minmax(0,1fr)_6rem_minmax(0,14rem)_5.5rem] gap-3 border-b border-line px-4 py-2.5 text-xs text-muted md:grid">
          <span aria-hidden="true" />
          <span>Problem</span>
          <span>Difficulty</span>
          <span>Topics</span>
          <span className="text-right">Acceptance</span>
        </div>
        <ul>
          <AnimatePresence initial={false}>
            {filtered.map((p, i) => (
              <motion.li
                key={p.slug}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                className="border-b border-line last:border-0"
              >
                <Link
                  href={`/algoarena/${p.slug}`}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-[background-color,padding] duration-200 hover:bg-page hover:pl-5 md:grid-cols-[2rem_minmax(0,1fr)_6rem_minmax(0,14rem)_5.5rem]"
                >
                  <span aria-label={p.status === "solved" ? "Solved" : p.status === "attempted" ? "Attempted" : "Not attempted"}>
                    {p.status === "solved" ? (
                      <CheckCircle2 size={18} className="text-bridge-600" />
                    ) : p.status === "attempted" ? (
                      <CircleDashed size={18} className="text-xp-600" />
                    ) : (
                      <span className="block size-[18px]" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium transition-colors group-hover:text-arena-800">{p.title}</span>
                    <span className="block truncate text-xs text-muted md:hidden">{p.topics.join(" · ")}</span>
                  </span>
                  <span><DifficultyBadge difficulty={p.difficulty} /></span>
                  <span className="hidden flex-wrap gap-1 md:flex">
                    {p.topics.map((t) => <span key={t} className="rounded-md bg-page px-1.5 py-0.5 text-xs text-muted">{t}</span>)}
                  </span>
                  <span className="hidden text-right text-sm text-muted md:block" title={`${p.submissions} submissions`}>
                    {p.acceptance === null ? "–" : `${p.acceptance}%`}
                  </span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted">
            No problems match these filters.{" "}
            <button type="button" onClick={reset} className="text-arena-600 hover:underline">Clear filters</button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted">
        Showing {filtered.length} of {problems.length} problems
      </p>
    </section>
  );
}
