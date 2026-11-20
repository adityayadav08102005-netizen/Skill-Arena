"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, FlaskConical, Flame, Loader2, Sparkles, XCircle } from "lucide-react";
import { SUBMISSION_LABELS } from "@/components/dashboard/StatusPill";
import { cn } from "@/lib/utils/cn";

function Pre({ label, children, tone }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] text-muted">{label}</div>
      <pre className={cn("max-h-40 overflow-auto whitespace-pre rounded-lg border px-2.5 py-1.5 font-mono text-[12px]", tone === "bad" ? "border-danger-50 bg-danger-50/50" : "border-line bg-page")}>
        {children || " "}
      </pre>
    </div>
  );
}

function Verdict({ status, passed, total, timeMs, memoryKb }) {
  const ok = status === "accepted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5", ok ? "bg-bridge-50 text-bridge-800" : "bg-danger-50 text-danger-800")}
    >
      <span className="inline-flex items-center gap-2 text-base font-medium">
        {ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
        {SUBMISSION_LABELS[status] ?? status}
      </span>
      <span className="text-xs">
        {total ? `${passed}/${total} tests passed` : ""}
        {timeMs != null ? ` · ${timeMs} ms` : ""}
        {memoryKb != null ? ` · ${(memoryKb / 1024).toFixed(1)} MB` : ""}
      </span>
    </motion.div>
  );
}

function DemoNotice({ children }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-xp-50 px-3 py-2.5 text-sm text-xp-800">
      <FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Output of the last Run or Submit. Demo-mode responses are always labelled as not executed. */
export default function ResultPanel({ busy, result, error }) {
  if (busy) {
    return (
      <p className="flex items-center gap-2 p-1 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" aria-hidden="true" /> {busy === "submit" ? "Judging your submission…" : "Running your code…"}
      </p>
    );
  }
  if (error) return <p role="alert" className="p-1 text-sm text-danger-600">{error}</p>;
  if (!result) return <p className="p-1 text-sm text-muted">Run your code to see the output here. Ctrl+Enter runs, Ctrl+Shift+Enter submits.</p>;

  const { kind, data } = result;

  // Demo mode: nothing was executed.
  if (!data.executed) {
    return (
      <div className="space-y-3">
        <DemoNotice>{data.message}</DemoNotice>
        {data.samples?.map((s) => (
          <div key={s.index} className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
            <Pre label={`Sample ${s.index + 1} input`}>{s.input}</Pre>
            <Pre label="Expected output">{s.expected}</Pre>
          </div>
        ))}
      </div>
    );
  }

  // Custom input run.
  if (data.custom) {
    const c = data.custom;
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted">
          Ran with your input{c.timeMs != null ? ` · ${c.timeMs} ms` : ""}{c.status !== "ran" ? ` · ${SUBMISSION_LABELS[c.status] ?? c.status}` : ""}
        </p>
        {c.compileOutput && <Pre label="Compiler output" tone="bad">{c.compileOutput}</Pre>}
        <Pre label="Output">{c.output}</Pre>
        {c.stderr && <Pre label="Errors" tone="bad">{c.stderr}</Pre>}
      </div>
    );
  }

  const failed = kind === "submit" ? data.failed : data.results?.find((r) => !r.passed);
  return (
    <div className="space-y-3">
      <Verdict status={data.status} passed={data.passed} total={data.total} timeMs={data.timeMs} memoryKb={data.memoryKb} />

      {kind === "submit" && data.rewards && (
        <AnimatePresence>
          {(data.rewards.solveXp > 0 || data.rewards.dailyXp > 0 || data.rewards.streakXp > 0 || data.streak) && (
            <motion.ul initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-wrap gap-2 text-xs">
              {data.rewards.solveXp > 0 && <li className="inline-flex items-center gap-1 rounded-full bg-xp-50 px-2.5 py-1 text-xp-800"><Sparkles size={12} aria-hidden="true" /> +{data.rewards.solveXp} XP first solve</li>}
              {data.rewards.dailyXp > 0 && <li className="rounded-full bg-arena-50 px-2.5 py-1 text-arena-800">+{data.rewards.dailyXp} XP daily challenge</li>}
              {data.rewards.streakXp > 0 && <li className="rounded-full bg-xp-50 px-2.5 py-1 text-xp-800">+{data.rewards.streakXp} XP streak milestone</li>}
              {data.streak && <li className="inline-flex items-center gap-1 rounded-full bg-page px-2.5 py-1 text-muted"><Flame size={12} aria-hidden="true" /> {data.streak.current}-day streak</li>}
              {data.rewards.contestXp > 0 && <li className="rounded-full bg-arena-50 px-2.5 py-1 text-arena-800">+{data.rewards.contestXp} XP contest participation</li>}
              {data.rewards.badges?.map((b) => (
                <li key={b.code} className="rounded-full bg-xp-200 px-2.5 py-1 text-xp-800">Badge: {b.name}{b.xpBonus ? ` +${b.xpBonus} XP` : ""}</li>
              ))}
              {data.rewards.leveledUp && <li className="rounded-full bg-arena-600 px-2.5 py-1 text-white">Level {data.rewards.level}!</li>}
              {data.status === "accepted" && !data.rewards.firstSolve && <li className="rounded-full bg-page px-2.5 py-1 text-muted">Already solved before, so no new XP</li>}
            </motion.ul>
          )}
        </AnimatePresence>
      )}

      {data.contest && (
        <p className="rounded-xl border border-line px-3 py-2 text-sm">
          {data.contest.pointsAwarded > 0 ? <span className="font-medium text-bridge-600">+{data.contest.pointsAwarded} contest points · </span> : null}
          Score {data.contest.score} · rank #{data.contest.rank} · {data.contest.solvedCount} solved · penalty {data.contest.penaltyMinutes} min
        </p>
      )}

      {data.compileOutput && <Pre label="Compiler output" tone="bad">{data.compileOutput}</Pre>}

      {kind === "run" && data.results && (
        <ul className="flex flex-wrap gap-1.5">
          {data.results.map((r) => (
            <li key={r.index} className={cn("rounded-full px-2.5 py-0.5 text-xs", r.passed ? "bg-bridge-50 text-bridge-800" : "bg-danger-50 text-danger-800")}>
              Sample {r.index + 1} {r.passed ? "passed" : "failed"}
            </li>
          ))}
        </ul>
      )}

      {failed && (failed.hidden ? (
        <p className="rounded-xl border border-line px-3 py-2 text-sm text-muted">
          Hidden test {failed.index + 1} failed ({SUBMISSION_LABELS[failed.status] ?? failed.status}). Hidden tests don&apos;t show their input; check edge cases.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3">
            <Pre label={`Test ${failed.index + 1} input`}>{failed.input}</Pre>
            <Pre label="Expected">{failed.expected}</Pre>
            <Pre label="Your output" tone="bad">{failed.actual}</Pre>
          </div>
          {failed.stderr && <Pre label="Errors" tone="bad">{failed.stderr}</Pre>}
        </div>
      ))}
    </div>
  );
}
