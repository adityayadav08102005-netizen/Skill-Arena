import { ArrowLeft, BadgeCheck, Clock, RotateCcw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import ProgressRing from "@/components/common/ProgressRing";
import Reveal from "@/components/common/Reveal";
import { cn } from "@/lib/utils/cn";
import ReviewList from "./ReviewList";

const fmtDuration = (s) => (s === null ? "–" : `${Math.floor(s / 60)}m ${s % 60}s`);

/** Results page: score ring, pass/fail, XP, comparison, verified skills, topic scores, answer review. */
export default function ResultsView({ review: r }) {
  const delta = r.previousBest === null ? null : r.percentage - r.previousBest;
  const verifiedNow = r.percentage >= r.verifyThreshold && r.verifiable.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/assessments" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden="true" /> Assessments
      </Link>

      <Reveal>
        <section className="flex flex-wrap items-center gap-6 rounded-card border border-line bg-panel p-6">
          <ProgressRing percent={r.percentage} size={116} stroke={10} tone={r.passed ? "bridge" : "xp"} label={`Scored ${r.percentage}%`}>
            {r.percentage}%
          </ProgressRing>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-xl font-medium tracking-tight">{r.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-full px-2.5 py-0.5", r.passed ? "bg-bridge-50 text-bridge-800" : "bg-danger-50 text-danger-800")}>
                {r.passed ? "Passed" : `Not passed · ${r.passPercentage}% needed`}
              </span>
              {r.proficiency && <span className="rounded-full bg-page px-2.5 py-0.5 text-muted">{r.proficiency.level}</span>}
              <span className="rounded-full bg-page px-2.5 py-0.5 capitalize text-muted">{r.difficulty ?? "mixed"}</span>
              {r.status === "expired" && <span className="rounded-full bg-xp-50 px-2.5 py-0.5 text-xp-800">Submitted when time ran out</span>}
              {r.isSample && <span className="rounded-full bg-xp-50 px-2.5 py-0.5 text-xp-800">Sample data</span>}
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>{r.score} of {r.total} correct</span>
              <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" /> {fmtDuration(r.durationSeconds)}</span>
              {r.xpAwarded > 0 && <span className="inline-flex items-center gap-1 text-xp-700"><Sparkles size={13} aria-hidden="true" /> +{r.xpAwarded} XP</span>}
              {delta !== null && (
                <span className={cn("inline-flex items-center gap-1", delta >= 0 ? "text-bridge-600" : "text-danger-600")}>
                  {delta >= 0 ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
                  {delta >= 0 ? "+" : ""}{delta} points vs your previous best
                </span>
              )}
            </p>
            {verifiedNow && (
              <p className="inline-flex items-center gap-1.5 rounded-lg bg-bridge-50 px-3 py-1.5 text-sm text-bridge-800">
                <BadgeCheck size={15} aria-hidden="true" /> {r.verifiable.join(", ")} now show as verified on your profile.
              </p>
            )}
          </div>
          {r.slug && (
            <Link href="/assessments" className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-bridge-200">
              <RotateCcw size={14} aria-hidden="true" /> Try again
            </Link>
          )}
        </section>
      </Reveal>

      {r.topics.length > 0 && (
        <Reveal delay={0.05}>
          <section className="rounded-card border border-line bg-panel p-5">
            <h2 className="mb-3 text-sm font-medium">Topic-wise score</h2>
            <ul className="space-y-2.5">
              {r.topics.map((t) => (
                <li key={t.topic} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
                  <span className="truncate">{t.topic}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-bridge-50">
                    <span className={cn("block h-full rounded-full", t.percent >= 60 ? "bg-bridge-400" : "bg-xp-400")} style={{ width: `${t.percent}%` }} />
                  </span>
                  <span className="text-right text-xs text-muted">{t.correct}/{t.total}</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      {r.questions.length > 0 ? (
        <ReviewList questions={r.questions} />
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          This sample attempt has no question-by-question record. Take the assessment to see a full review.
        </p>
      )}
    </div>
  );
}
