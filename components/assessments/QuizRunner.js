"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Clock, Flag, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const pad = (n) => String(n).padStart(2, "0");

/**
 * The timed quiz. The deadline comes from the server (corrected for clock
 * drift), answers autosave, and the attempt is submitted automatically when
 * time runs out. Scoring happens only on the server.
 */
export default function QuizRunner({ attempt }) {
  const router = useRouter();
  const total = attempt.questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(attempt.answers);
  const [flagged, setFlagged] = useState(new Set(attempt.flagged));
  const [save, setSave] = useState("saved"); // saved | saving | error
  const [remaining, setRemaining] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const offset = useRef(0);
  const pending = useRef(null);
  const submittedRef = useRef(false);

  const persist = useCallback(
    async (nextAnswers, nextFlags) => {
      setSave("saving");
      const res = await fetch(`/api/assessments/attempts/${attempt.attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers, flagged: [...nextFlags] }),
      }).catch(() => null);
      setSave(res?.ok ? "saved" : "error");
      return Boolean(res?.ok);
    },
    [attempt.attemptId],
  );

  const queueSave = (nextAnswers, nextFlags) => {
    clearTimeout(pending.current);
    setSave("saving");
    pending.current = setTimeout(() => persist(nextAnswers, nextFlags), 500);
  };

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError("");
      clearTimeout(pending.current);
      if (!auto) await persist(answers, flagged); // flush the last change (on timeout the server already has it)
      const res = await fetch(`/api/assessments/attempts/${attempt.attemptId}/submit`, { method: "POST" }).catch(() => null);
      if (!res?.ok) {
        submittedRef.current = false;
        setSubmitting(false);
        return setError("Couldn't submit. Check your connection and try again; your answers are saved.");
      }
      router.refresh();
    },
    [answers, flagged, attempt.attemptId, persist, router],
  );

  // Timer: deadline from the server, corrected by the client/server clock difference.
  useEffect(() => {
    offset.current = Date.parse(attempt.serverNow) - Date.now();
    const deadline = Date.parse(attempt.expiresAt);
    const tick = () => setRemaining(Math.max(0, Math.round((deadline - (Date.now() + offset.current)) / 1000)));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [attempt.expiresAt, attempt.serverNow]);

  useEffect(() => {
    if (remaining === 0) {
      const t = setTimeout(() => submit(true), 0);
      return () => clearTimeout(t);
    }
  }, [remaining, submit]);

  const choose = (option) => {
    const next = [...answers];
    next[index] = next[index] === option ? null : option;
    setAnswers(next);
    queueSave(next, flagged);
  };

  const toggleFlag = () => {
    const next = new Set(flagged);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setFlagged(next);
    queueSave(answers, next);
  };

  // Keyboard: 1–6 answer, ←/→ move, F flag.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("textarea, input") || confirming) return;
      const q = attempt.questions[index];
      if (/^[1-6]$/.test(e.key) && Number(e.key) <= q.options.length) choose(Number(e.key) - 1);
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key.toLowerCase() === "f") toggleFlag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const q = attempt.questions[index];
  const answered = answers.filter((a) => a !== null).length;
  const urgent = remaining !== null && remaining <= 60;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-full border border-line bg-panel/95 px-4 py-2 shadow-float backdrop-blur-md">
        <span className="min-w-0 truncate text-sm font-medium">
          {attempt.title} <span className="font-normal capitalize text-muted">· {attempt.difficulty}</span>
        </span>
        <span className="flex items-center gap-3 text-xs">
          <span className="text-muted" aria-live="polite">
            {save === "saving" ? "Saving…" : save === "error" ? <span className="text-danger-600">Not saved, retrying on next change</span> : <span className="inline-flex items-center gap-1"><Check size={12} aria-hidden="true" /> Saved</span>}
          </span>
          <motion.span
            animate={urgent ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
            className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-sm tabular-nums", urgent ? "bg-danger-50 text-danger-800" : "bg-xp-50 text-xp-800")}
            role="timer"
            aria-label="Time left"
          >
            <Clock size={13} aria-hidden="true" />
            {remaining === null ? "--:--" : `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`}
          </motion.span>
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-bridge-50" aria-hidden="true">
        <motion.div className="h-full rounded-full bg-bridge-400" animate={{ width: `${(answered / total) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>

      <section className="rounded-card border border-line bg-panel p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>Question {index + 1} of {total}{q.topic ? ` · ${q.topic}` : ""}</span>
          <button
            type="button"
            onClick={toggleFlag}
            aria-pressed={flagged.has(index)}
            className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors", flagged.has(index) ? "bg-xp-50 text-xp-800" : "hover:bg-page")}
          >
            <Flag size={12} aria-hidden="true" /> {flagged.has(index) ? "Flagged" : "Flag for review"}
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
            <h2 className="mt-2 text-base font-medium leading-relaxed">{q.prompt}</h2>
            <div role="radiogroup" aria-label={`Question ${index + 1} options`} className="mt-4 space-y-2">
              {q.options.map((option, i) => {
                const selected = answers[index] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(i)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
                      "before:absolute before:inset-0 before:bg-bridge-50 before:transition-transform before:duration-400 before:ease-snap",
                      selected ? "border-bridge-400 text-bridge-800 before:translate-x-0" : "border-line before:-translate-x-[101%] hover:before:-translate-x-[60%]",
                    )}
                  >
                    <span className={cn("relative flex size-6 shrink-0 items-center justify-center rounded-md text-xs", selected ? "bg-bridge-600 text-white" : "bg-page text-muted")}>{LETTERS[i]}</span>
                    <span className="relative">{option}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-page disabled:opacity-40">
            <ArrowLeft size={14} aria-hidden="true" /> Previous
          </button>
          {index < total - 1 ? (
            <button type="button" onClick={() => setIndex((i) => i + 1)} className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-1.5 text-sm transition-colors hover:border-bridge-200">
              Next <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={() => (answered < total ? setConfirming(true) : submit())} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-full bg-bridge-600 px-4 py-1.5 text-sm font-medium text-white">
              {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />} Submit
            </button>
          )}
        </div>
      </section>

      <section className="rounded-card border border-line bg-panel p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>{answered} of {total} answered{flagged.size ? ` · ${flagged.size} flagged` : ""}</span>
          <span className="hidden sm:inline">Keys: 1–{Math.max(...attempt.questions.map((x) => x.options.length))} answer · ← → move · F flag</span>
        </div>
        <ol className="flex flex-wrap gap-1.5">
          {attempt.questions.map((_, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Question ${i + 1}${answers[i] !== null ? ", answered" : ""}${flagged.has(i) ? ", flagged" : ""}`}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-xs transition-all duration-200 hover:-translate-y-0.5",
                  flagged.has(i) ? "bg-xp-50 text-xp-800" : answers[i] !== null ? "bg-bridge-50 text-bridge-800" : "border border-line",
                  i === index && "ring-2 ring-bridge-400 ring-offset-1",
                )}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <AnimatePresence mode="wait">
            {confirming ? (
              <motion.div key="confirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-2 text-sm">
                <span>{total - answered} unanswered. Unanswered questions count as wrong.</span>
                <button type="button" onClick={() => submit()} disabled={submitting} className="inline-flex items-center gap-1 rounded-full bg-bridge-600 px-3 py-1.5 text-white">
                  {submitting && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Submit anyway
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-3 py-1.5 text-muted hover:text-ink">Keep going</button>
              </motion.div>
            ) : (
              <motion.button key="submit" type="button" onClick={() => (answered < total ? setConfirming(true) : submit())} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-full border border-bridge-600 px-4 py-1.5 text-sm text-bridge-600 transition-colors hover:bg-bridge-600 hover:text-white">
                {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />} Submit assessment
              </motion.button>
            )}
          </AnimatePresence>
          {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
        </div>
      </section>
    </div>
  );
}
