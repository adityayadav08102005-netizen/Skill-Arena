import { BadgeCheck, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import DashCard from "@/components/dashboard/DashCard";
import { cn } from "@/lib/utils/cn";
import { APP_TIMEZONE } from "@/lib/utils/time";
import ScoreTrend from "./ScoreTrend";

const LEVEL_TONE = { Expert: "bg-xp-50 text-xp-800", Advanced: "bg-bridge-50 text-bridge-800", Intermediate: "bg-info-50 text-info-800", Beginner: "bg-page text-muted" };
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric" });

/** Performance analysis: trend, proficiency per category, strengths, focus areas, history. */
export default function PerformancePanel({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <DashCard title="Score trend" icon={TrendingUp} tone="bridge" action={<span className="text-xs text-muted">{data.passed} of {data.taken} passed · avg {data.average}%</span>}>
          {data.trend.length > 1 ? <ScoreTrend points={data.trend.slice(-20)} /> : <p className="rounded-xl bg-page px-4 py-6 text-center text-sm text-muted">Take another assessment to see a trend.</p>}
        </DashCard>
        <DashCard title="Strengths and focus areas" icon={Target} tone="bridge">
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="mb-1.5 text-xs text-muted">Strongest topics</h3>
              <ul className="space-y-1.5">
                {data.strengths.map((t) => (
                  <li key={t.topic} className="flex justify-between gap-2"><span className="truncate">{t.topic}</span><span className="shrink-0 text-bridge-600">{t.percent}%</span></li>
                ))}
                {!data.strengths.length && <li className="text-muted">Topic scores appear after your first assessment.</li>}
              </ul>
            </div>
            <div>
              <h3 className="mb-1.5 text-xs text-muted">Topics to practise</h3>
              <ul className="space-y-1.5">
                {data.focusAreas.map((t) => (
                  <li key={t.topic} className="flex justify-between gap-2"><span className="truncate">{t.topic}</span><span className="shrink-0 text-danger-600">{t.percent}% · {t.correct}/{t.total}</span></li>
                ))}
                {!data.focusAreas.length && data.strengths.length > 0 && <li className="text-muted">Nothing below 100% yet. Nice.</li>}
              </ul>
            </div>
          </div>
        </DashCard>
      </div>

      <DashCard title="Skill proficiency" icon={BadgeCheck} tone="bridge" action={<span className="text-xs text-muted">Best score per category</span>}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {data.proficiency.map((p) => (
            <li key={p.category} className="rounded-xl border border-line p-3 transition-colors hover:border-bridge-200">
              <div className="truncate text-sm" title={p.label}>{p.label}</div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", p.level ? LEVEL_TONE[p.level] : "bg-page text-muted")}>{p.level ?? "Not taken"}</span>
                <span className="text-xs text-muted">{p.best === null ? "–" : `${p.best}%`}</span>
              </div>
              <div className="mt-2 flex gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= p.rank ? "bg-bridge-400" : "bg-page")} />)}
              </div>
            </li>
          ))}
        </ul>
      </DashCard>

      <DashCard title="History" icon={ClipboardCheck} tone="bridge">
        <ul>
          {data.history.map((h) => (
            <li key={h.id}>
              <Link href={`/assessments/attempt/${h.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-[background-color,padding] duration-200 hover:bg-page hover:pl-3.5">
                <span className="min-w-0">
                  <span className="block truncate">{h.title}</span>
                  <span className="block text-xs text-muted">
                    {fmt(h.date)} · {h.difficulty ?? "mixed"} · {h.score}/{h.total}{h.xpAwarded ? ` · +${h.xpAwarded} XP` : ""}{h.isSample ? " · sample data" : ""}
                  </span>
                </span>
                <span className={cn("shrink-0 text-sm font-medium", h.passed ? "text-bridge-600" : "text-danger-600")}>{h.percentage}%</span>
              </Link>
            </li>
          ))}
        </ul>
      </DashCard>
    </div>
  );
}
