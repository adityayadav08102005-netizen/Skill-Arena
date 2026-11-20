import { CalendarClock, Trophy, Users } from "lucide-react";
import Link from "next/link";
import HoverCard from "@/components/common/HoverCard";
import Reveal from "@/components/common/Reveal";
import Countdown from "@/components/landing/Countdown";
import { APP_TIMEZONE } from "@/lib/utils/time";
import RegisterButton from "./RegisterButton";

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function StatePill({ state }) {
  if (state === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-2.5 py-0.5 text-xs text-danger-800">
        <span className="size-1.5 animate-pulse rounded-full bg-danger-600" aria-hidden="true" /> Live
      </span>
    );
  }
  if (state === "upcoming") return <span className="rounded-full bg-arena-50 px-2.5 py-0.5 text-xs text-arena-800">Upcoming</span>;
  return <span className="rounded-full bg-page px-2.5 py-0.5 text-xs text-muted">Ended</span>;
}

/** Contest summary card used on /contests. */
export default function ContestCard({ contest: c, viewer, delay = 0, linked = true }) {
  return (
    <Reveal delay={delay}>
      <HoverCard className="h-full" accent={c.state === "ended" ? "arena" : "arena"} showArrow={false}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <StatePill state={c.state} />
            <h3 className="mt-2 text-lg font-medium tracking-tight">
              {linked ? <Link href={`/contests/${c.slug}`} className="after:absolute after:inset-0 hover:text-arena-800">{c.title}</Link> : c.title}
            </h3>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><CalendarClock size={13} aria-hidden="true" /> {fmtDateTime(c.startsAt)} · {c.durationMinutes} min</span>
              <span>{c.problemCount} problems · {c.totalPoints} points</span>
              <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden="true" /> {c.participants} registered</span>
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-2 text-right">
            {c.state === "upcoming" && (
              <span>
                <span className="block text-[11px] text-muted">starts in</span>
                <Countdown startsAt={c.startsAt} className="font-mono text-lg tabular-nums" />
              </span>
            )}
            {c.state === "live" && (
              <span>
                <span className="block text-[11px] text-muted">ends in</span>
                <Countdown startsAt={c.endsAt} className="font-mono text-lg tabular-nums" />
              </span>
            )}
            {c.state === "ended" && c.myResult && (
              <span className="inline-flex items-center gap-1 rounded-full bg-xp-50 px-3 py-1 text-sm text-xp-800">
                <Trophy size={14} aria-hidden="true" /> {c.myResult.rank ? `#${c.myResult.rank} · ` : ""}{c.myResult.score} pts
              </span>
            )}
            {linked && <RegisterButton slug={c.slug} registered={c.registered} state={c.state} viewer={viewer} size="sm" />}
          </div>
        </div>
      </HoverCard>
    </Reveal>
  );
}
