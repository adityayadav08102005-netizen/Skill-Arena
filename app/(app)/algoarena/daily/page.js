import { ArrowLeft, CalendarDays, CheckCircle2, Circle, Flame } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ArenaTabs from "@/components/algoarena/ArenaTabs";
import DifficultyBadge from "@/components/algoarena/DifficultyBadge";
import Reveal from "@/components/common/Reveal";
import { getCurrentUser } from "@/lib/auth/session";
import { dayKey } from "@/lib/utils/time";
import { getHistory } from "@/services/daily";

export const metadata = { title: "Daily challenge history" };

const fmt = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

async function History() {
  await connection();
  const current = await getCurrentUser();
  const viewerId = current?.user.role === "student" ? current.user.id : null;
  const history = await getHistory(viewerId, 14);
  const today = dayKey();
  const completed = history.filter((h) => h.completed).length;

  return (
    <div className="space-y-5">
      <Link href="/algoarena" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden="true" /> AlgoArena
      </Link>
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
              <CalendarDays size={22} className="text-arena-600" aria-hidden="true" /> Daily challenges
            </h1>
            <p className="mt-0.5 text-sm text-muted">One problem a day. Solving it the same day adds bonus XP and keeps your streak going.</p>
          </div>
          {viewerId && (
            <div className="flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-xp-50 px-3 py-1 text-xp-800">
                <Flame size={13} aria-hidden="true" /> {current.profile?.streak?.current ?? 0}-day streak · best {current.profile?.streak?.longest ?? 0}
              </span>
              <span className="rounded-full bg-bridge-50 px-3 py-1 text-bridge-800">{completed} of {history.length} completed</span>
            </div>
          )}
        </header>
      </Reveal>
      <ArenaTabs />

      <ol className="space-y-2">
        {history.map((h, i) => (
          <Reveal key={h.date} delay={Math.min(i * 0.03, 0.3)} as="li">
            <Link
              href={`/algoarena/${h.problem.slug}`}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-arena-200"
            >
              <span className="flex min-w-0 items-center gap-3">
                {h.completed ? (
                  <CheckCircle2 size={20} className="shrink-0 text-bridge-600" aria-label="Completed" />
                ) : (
                  <Circle size={20} className="shrink-0 text-line" aria-label="Not completed" />
                )}
                <span className="min-w-0">
                  <span className="block text-xs text-muted">{h.date === today ? "Today" : fmt(h.date)}</span>
                  <span className="block truncate font-medium group-hover:text-arena-800">{h.problem.title}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {h.completed && h.xpAwarded > 0 && <span className="text-xs text-xp-700">+{h.xpAwarded} XP</span>}
                <DifficultyBadge difficulty={h.problem.difficulty} />
              </span>
            </Link>
          </Reveal>
        ))}
      </ol>
      {!viewerId && (
        <p className="text-sm text-muted">
          <Link href="/login?next=%2Falgoarena%2Fdaily" className="text-arena-600 hover:underline">Log in</Link> as a student to see which ones you completed.
        </p>
      )}
    </div>
  );
}

export default function DailyHistoryPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <History />
    </Suspense>
  );
}
