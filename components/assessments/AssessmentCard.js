"use client";

import { motion } from "motion/react";
import { Clock, ListOrdered, Loader2, Play, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { proficiencyFor } from "@/lib/assessments/scoring";
import { cn } from "@/lib/utils/cn";

const LABEL = { mixed: "Mixed", easy: "Easy", medium: "Medium", hard: "Hard" };

/** One assessment: difficulty picker (with question counts), start or resume, and your best score. */
export default function AssessmentCard({ item, viewer, index = 0, demo }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState("mixed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const option = item.options.find((o) => o.key === difficulty);
  const prof = proficiencyFor(item.best);

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/assessments/${item.slug}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ difficulty }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setBusy(false);
      return setError(data?.error || "Couldn't start. Try again.");
    }
    router.push(`/assessments/attempt/${data.attemptId}`);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3), ease: [0.2, 0.8, 0.2, 1] }}
      className="flex h-full flex-col rounded-card border border-line bg-panel p-4 transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1 hover:border-bridge-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium">{item.categoryLabel}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.description}</p>
        </div>
        {item.best !== null && (
          <span className="shrink-0 rounded-full bg-bridge-50 px-2 py-0.5 text-xs text-bridge-800" title={`Best score across ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}`}>
            Best {item.best}% · {prof.level}
          </span>
        )}
      </div>

      <div role="radiogroup" aria-label="Difficulty" className="mt-3 grid grid-cols-4 gap-1 rounded-full bg-page p-1">
        {item.options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={difficulty === o.key}
            disabled={!o.enabled}
            title={o.enabled ? `${o.questions} questions · ${o.minutes} min` : `Only ${o.available} ${LABEL[o.key].toLowerCase()} question${o.available === 1 ? "" : "s"} so far`}
            onClick={() => setDifficulty(o.key)}
            className={cn(
              "relative rounded-full py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              difficulty === o.key ? "text-bridge-800" : "text-muted hover:text-ink",
            )}
          >
            {difficulty === o.key && <motion.span layoutId={`diff-${item.slug}`} className="absolute inset-0 rounded-full bg-panel shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{LABEL[o.key]}</span>
          </button>
        ))}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <div className="inline-flex items-center gap-1"><ListOrdered size={13} aria-hidden="true" /><dt className="sr-only">Questions</dt><dd>{option.questions} questions</dd></div>
        <div className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" /><dt className="sr-only">Time</dt><dd>{option.minutes} min</dd></div>
        <div><dt className="sr-only">Pass mark</dt><dd>Pass {item.passPercentage}%</dd></div>
        <div className="inline-flex items-center gap-1 text-xp-700"><Sparkles size={13} aria-hidden="true" /><dt className="sr-only">Reward</dt><dd>+{item.xpReward} XP</dd></div>
      </dl>

      <div className="mt-auto pt-4">
        {demo ? (
          <p className="text-xs text-muted">Taking assessments needs a connected database.</p>
        ) : !viewer.signedIn ? (
          <Link href="/login?next=%2Fassessments" className="text-sm text-bridge-600 hover:underline">Log in to take it</Link>
        ) : viewer.role !== "student" ? (
          <p className="text-xs text-muted">Assessments are for student accounts.</p>
        ) : item.inProgressId ? (
          <Link href={`/assessments/attempt/${item.inProgressId}`} className="inline-flex items-center gap-1.5 rounded-full bg-xp-50 px-4 py-2 text-sm text-xp-800 transition-transform hover:-translate-y-0.5">
            <RotateCcw size={14} aria-hidden="true" /> Resume attempt
          </Link>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy || !option.enabled}
            className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-bridge-600 px-4 py-2 text-sm font-medium text-white before:absolute before:inset-0 before:-translate-x-[101%] before:bg-bridge-800 before:transition-transform before:duration-300 before:ease-snap hover:before:translate-x-0"
          >
            {busy ? <Loader2 size={14} className="relative animate-spin" aria-hidden="true" /> : <Play size={14} className="relative" aria-hidden="true" />}
            <span className="relative">{item.attempts ? "Retake" : "Start"} · {LABEL[difficulty].toLowerCase()}</span>
          </button>
        )}
        {error && <p role="alert" className="mt-2 text-xs text-danger-600">{error}</p>}
      </div>
    </motion.article>
  );
}
