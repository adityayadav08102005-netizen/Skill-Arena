import {
  Award, ClipboardCheck, Code, Flame, Globe, Hammer, Lock, Medal, Mountain, Send, Sparkles, Swords, TrendingDown, TrendingUp, Trophy, UserCheck, Zap,
} from "lucide-react";
import Link from "next/link";
import NumberTicker from "@/components/common/NumberTicker";
import ProgressRing from "@/components/common/ProgressRing";
import Reveal from "@/components/common/Reveal";
import DashCard from "@/components/dashboard/DashCard";
import { cn } from "@/lib/utils/cn";
import { APP_TIMEZONE } from "@/lib/utils/time";
import GoalsCard from "./GoalsCard";

const ICONS = { Sparkles, Code, Hammer, Medal, Mountain, Flame, Zap, Swords, Trophy, ClipboardCheck, Award, UserCheck, Send };
const CATEGORY_LABEL = { coding: "Coding", streak: "Streaks", contest: "Contests", assessment: "Assessments", profile: "Profile", career: "Careers" };
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric" });

function Change({ now, before, unit }) {
  if (!before && !now) return <span className="text-xs text-muted">No activity yet</span>;
  if (!before) return <span className="text-xs text-bridge-600">New this month</span>;
  const diff = Math.round(((now - before) / before) * 100);
  const up = diff >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", up ? "text-bridge-600" : "text-danger-600")}>
      <Icon size={13} aria-hidden="true" /> {up ? "+" : ""}{diff}% vs last month ({before} {unit})
    </span>
  );
}

export default function ProgressView({ data }) {
  const { level, rank, streak, goals, week, month, milestones, badges } = data;
  const earned = badges.filter((b) => b.earned).length;
  const categories = [...new Set(badges.map((b) => b.category))];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <DashCard tone="xp" delay={0.02}>
          <div className="flex items-center gap-4">
            <ProgressRing percent={level.percent} size={76} stroke={7} tone="xp" label={`Level ${level.level}, ${level.percent}% to the next`}>
              {level.level}
            </ProgressRing>
            <div>
              <div className="text-xs text-muted">Level · <span className="capitalize">{level.skillLevel}</span></div>
              <div className="text-2xl font-medium tracking-tight"><NumberTicker value={level.xp} /> XP</div>
              <div className="text-xs text-muted">{level.toNext.toLocaleString("en-IN")} XP to level {level.level + 1}</div>
            </div>
          </div>
        </DashCard>
        <DashCard tone="arena" delay={0.05}>
          <div className="flex items-center gap-2 text-xs text-muted"><Globe size={14} aria-hidden="true" /> Global rank</div>
          <div className="mt-1 text-2xl font-medium tracking-tight">#<NumberTicker value={rank.rank} /> <span className="text-sm font-normal text-muted">of {rank.total}</span></div>
          <Link href="/leaderboard" className="mt-1 inline-block text-xs text-arena-600 hover:underline">Open the leaderboard</Link>
        </DashCard>
        <DashCard tone="xp" delay={0.08}>
          <div className="flex items-center gap-2 text-xs text-muted"><Flame size={14} aria-hidden="true" /> Coding streak</div>
          <div className="mt-1 text-2xl font-medium tracking-tight"><NumberTicker value={streak.current} /> days</div>
          <div className="text-xs text-muted">Longest {streak.longest} days</div>
        </DashCard>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Reveal delay={0.05}>
          <GoalsCard goals={goals} week={week} monthXp={month.xp} />
        </Reveal>
        <DashCard title="This month" icon={TrendingUp} delay={0.08}>
          <ul className="space-y-4">
            <li>
              <div className="flex items-baseline justify-between gap-2 text-sm"><span>XP earned</span><span className="font-medium">{month.xp.toLocaleString("en-IN")}</span></div>
              <Change now={month.xp} before={month.last.xp} unit="XP" />
            </li>
            <li>
              <div className="flex items-baseline justify-between gap-2 text-sm"><span>Problems solved</span><span className="font-medium">{month.solved}</span></div>
              <Change now={month.solved} before={month.last.solved} unit="solved" />
            </li>
            <li>
              <div className="flex items-baseline justify-between gap-2 text-sm"><span>Active days</span><span className="font-medium">{month.activeDays}</span></div>
              <Change now={month.activeDays} before={month.last.activeDays} unit="days" />
            </li>
          </ul>
        </DashCard>
      </div>

      <DashCard title="Next milestones" icon={Mountain} delay={0.05}>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {milestones.map((m) => (
            <li key={`${m.kind}-${m.title}`} className="rounded-xl border border-line p-3 transition-colors hover:border-arena-200">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{m.title}</span>
                <span className="text-xs text-muted">{m.percent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-arena-50">
                <div className="h-full rounded-full bg-arena-600 transition-[width] duration-1000" style={{ width: `${m.percent}%` }} />
              </div>
              <div className="mt-1.5 text-xs text-muted">{m.detail}</div>
            </li>
          ))}
        </ul>
      </DashCard>

      <DashCard title="Badges" icon={Award} tone="xp" delay={0.05} action={<span className="text-xs text-muted">{earned} of {badges.length} earned</span>}>
        <div className="space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-medium text-muted">{CATEGORY_LABEL[cat] ?? cat}</h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {badges.filter((b) => b.category === cat).map((b) => {
                  const Icon = ICONS[b.icon] ?? Award;
                  return (
                    <li
                      key={b.code}
                      className={cn(
                        "group rounded-2xl border p-3 transition-all duration-300 ease-snap hover:-translate-y-1",
                        b.earned ? "border-xp-200 bg-xp-50/50 hover:-rotate-1" : "border-line",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", b.earned ? "bg-xp-200 text-xp-800" : "bg-page text-muted")}>
                          {b.earned ? <Icon size={19} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{b.name}</span>
                          <span className="block text-[11px] text-muted">{b.earned ? `Earned ${fmtDate(b.earnedAt)}` : b.xpBonus ? `+${b.xpBonus} XP` : "Locked"}</span>
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted">{b.description}</p>
                      {!b.earned && (
                        <div className="mt-2">
                          <div className="h-1 overflow-hidden rounded-full bg-page">
                            <div className="h-full rounded-full bg-xp-400" style={{ width: `${b.progress.percent}%` }} />
                          </div>
                          <span className="mt-1 block text-[11px] text-muted">
                            {b.progress.kind === "rank"
                              ? b.progress.value ? `Best rank #${b.progress.value} · need top ${b.progress.threshold}` : "No finished contests yet"
                              : `${b.progress.value} of ${b.progress.threshold}`}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </DashCard>
    </div>
  );
}
