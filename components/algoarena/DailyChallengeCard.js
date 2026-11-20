import { CalendarDays, CheckCircle2, Flame } from "lucide-react";
import Link from "next/link";
import Reveal from "@/components/common/Reveal";
import SlideButton from "@/components/common/SlideButton";
import Countdown from "@/components/landing/Countdown";
import DifficultyBadge from "./DifficultyBadge";

/** Today's challenge: problem, bonus XP, completion state and a countdown to the next one. */
export default function DailyChallengeCard({ daily, resetAt, streak, signedIn }) {
  if (!daily) return null;
  const { problem } = daily;
  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-card border border-arena-200 bg-arena-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-arena-800">
              <CalendarDays size={14} aria-hidden="true" /> Daily challenge
            </span>
            <h2 className="mt-1.5 text-xl font-medium tracking-tight">{problem.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <DifficultyBadge difficulty={problem.difficulty} />
              {problem.topics.map((t) => (
                <span key={t} className="rounded-full bg-panel px-2 py-0.5 text-arena-800">{t}</span>
              ))}
              <span className="rounded-full bg-xp-50 px-2 py-0.5 text-xp-800">
                +{problem.xpReward} XP · +{daily.bonusXp} daily bonus
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted">Next challenge in</div>
            <Countdown startsAt={resetAt} className="font-mono text-lg tabular-nums" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {daily.completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bridge-50 px-3 py-1.5 text-sm text-bridge-800">
              <CheckCircle2 size={16} aria-hidden="true" /> Completed today
            </span>
          ) : (
            <SlideButton href={`/algoarena/${problem.slug}`}>Solve today&apos;s challenge</SlideButton>
          )}
          {signedIn && streak && (
            <span className="inline-flex items-center gap-1 text-sm text-xp-700">
              <Flame size={15} aria-hidden="true" /> {streak.current}-day streak
            </span>
          )}
          <Link href="/algoarena/daily" className="text-sm text-arena-600 hover:underline">
            Challenge history
          </Link>
        </div>
      </section>
    </Reveal>
  );
}
