import {
  Activity,
  Award,
  Bookmark,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Code,
  Code2,
  Flame,
  Hammer,
  ListChecks,
  Medal,
  Mountain,
  Send,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import NumberTicker from "@/components/common/NumberTicker";
import ProgressRing from "@/components/common/ProgressRing";
import Countdown from "@/components/landing/Countdown";
import { relativeTime } from "@/lib/utils/time";
import ActivityHeatmap from "./ActivityHeatmap";
import AssessmentChart from "./AssessmentChart";
import DashCard, { EmptyState, Row } from "./DashCard";
import DifficultyBar from "./DifficultyBar";
import Greeting from "./Greeting";
import RecommendationList from "./RecommendationList";
import { APPLICATION_STATUS_ORDER, ApplicationStatus, SubmissionStatus, applicationLabel } from "./StatusPill";
import TopicProgress from "./TopicProgress";
import XpChart from "./XpChart";

const BADGE_ICONS = { Sparkles, Code, Hammer, Medal, Mountain, Flame, Zap, Swords, Trophy, ClipboardCheck, Award, UserCheck, Send };
const ACTIVITY_ICONS = { solved: Code2, assessment: ClipboardCheck, application: Send, achievement: Award };
const LANG = { python: "Python", java: "Java", cpp: "C++", javascript: "JavaScript" };
const DIFF_TONE = { easy: "text-bridge-600", medium: "text-xp-700", hard: "text-danger-600" };

function Stat({ label, children, sub, delay, tone = "arena" }) {
  return (
    <DashCard delay={delay} tone={tone}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-medium tracking-tight">{children}</div>
      {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
    </DashCard>
  );
}

export default function DashboardView({ data }) {
  const { xp, streak, coding, assessments, contests, achievements, applications, saved, recommendations, activity, completion } = data;
  const generatedAt = new Date(data.generatedAt);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            <Greeting name={data.user.name} />
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {completion.percent < 100 ? (
              <>
                Profile {completion.percent}% complete ·{" "}
                <Link href="/profile" className="text-arena-600 hover:underline">
                  add {completion.missing[0]?.toLowerCase()}
                </Link>{" "}
                to keep going
              </>
            ) : (
              "Your profile is complete. Keep the streak going."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-xp-50 px-3 py-1 text-xp-800">
            <Flame size={13} aria-hidden="true" /> {streak.current}-day streak
          </span>
          <span className="rounded-full bg-arena-50 px-3 py-1 capitalize text-arena-800">
            Level {xp.level} · {xp.skillLevel}
          </span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard tone="xp" delay={0.02}>
          <div className="flex items-center gap-3">
            <ProgressRing percent={xp.percent} tone="xp" label={`Level ${xp.level}, ${xp.percent}% to the next level`} />
            <div>
              <div className="text-xs text-muted">Total XP</div>
              <div className="text-2xl font-medium tracking-tight">
                <NumberTicker value={xp.total} />
              </div>
              <div className="text-xs text-muted">{xp.toNext.toLocaleString("en-IN")} to level {xp.level + 1}</div>
            </div>
          </div>
        </DashCard>
        <Stat label="Problems solved" delay={0.05} sub={<DifficultyBar counts={coding.byDifficulty} />}>
          <NumberTicker value={coding.solved} />
          <span className="text-sm font-normal text-muted"> / {coding.totalProblems}</span>
        </Stat>
        <Stat
          label="Accuracy"
          delay={0.08}
          tone="bridge"
          sub={`${coding.accepted} accepted of ${coding.submissions} submissions · ${coding.attempted} problems tried`}
        >
          {coding.accuracy === null ? "–" : <><NumberTicker value={coding.accuracy} />%</>}
        </Stat>
        <Stat
          label="Assessments"
          delay={0.11}
          tone="bridge"
          sub={assessments.best ? `Best: ${assessments.best.label} ${assessments.best.best}%` : "Take one to see your scores"}
        >
          <NumberTicker value={assessments.taken} /> <span className="text-sm font-normal text-muted">taken</span>
          {assessments.average !== null && <span className="ml-2 text-sm font-normal text-muted">avg {assessments.average}%</span>}
        </Stat>
      </div>

      {/* Activity + XP */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <DashCard title="Coding activity" icon={Activity} delay={0.05} action={<span className="text-xs text-muted">{coding.activeDays} active days · longest streak {streak.longest}</span>}>
          <ActivityHeatmap days={coding.heatmap} />
        </DashCard>
        <DashCard title="XP, last 30 days" icon={TrendingUp} delay={0.08} action={<span className="text-xs text-muted">+{xp.gainedInWindow.toLocaleString("en-IN")} XP</span>}>
          <XpChart series={xp.series} />
        </DashCard>
      </div>

      {/* Topics + assessments */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <DashCard
          title="Topic progress"
          icon={Target}
          delay={0.05}
          action={<Link href="/algoarena" className="text-xs text-arena-600 hover:underline">Practice in AlgoArena</Link>}
        >
          {coding.topics.length ? <TopicProgress topics={coding.topics} /> : <EmptyState>No problems published yet.</EmptyState>}
        </DashCard>
        <DashCard
          title="Assessment performance"
          icon={ClipboardCheck}
          tone="bridge"
          delay={0.08}
          action={
            <Link href="/assessments" className="text-xs text-bridge-600 hover:underline">
              {assessments.taken ? `${assessments.passed} of ${assessments.taken} passed · ` : ""}open assessments
            </Link>
          }
        >
          {assessments.scores.length ? <AssessmentChart scores={assessments.scores} /> : <EmptyState>Your best score in each category will show here.</EmptyState>}
        </DashCard>
      </div>

      {/* Applications + recommendations */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <DashCard
          title="Applications"
          icon={Briefcase}
          tone="bridge"
          delay={0.05}
          action={<Link href="/applications" className="text-xs text-bridge-600 hover:underline">{applications.total} total · view all</Link>}
        >
          {applications.total > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
              {APPLICATION_STATUS_ORDER.filter((s) => applications.byStatus[s]).map((s) => (
                <li key={s} className="rounded-full border border-line px-2 py-0.5 text-muted">
                  {applicationLabel(s)} <span className="font-medium text-ink">{applications.byStatus[s]}</span>
                </li>
              ))}
            </ul>
          )}
          {applications.recent.length ? (
            <ul>
              {applications.recent.map((a) => (
                <Row key={a.id}>
                  <span className="min-w-0">
                    <span className="block truncate">{a.title}</span>
                    <span className="block truncate text-xs text-muted">{a.companyName} · {relativeTime(a.appliedAt, generatedAt)}</span>
                  </span>
                  <ApplicationStatus status={a.status} />
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState>You haven&apos;t applied anywhere yet.</EmptyState>
          )}
        </DashCard>
        <DashCard title="Recommended for you" icon={Sparkles} tone="bridge" delay={0.08} action={<span className="text-xs text-muted">Matched on skills and eligibility</span>}>
          {recommendations.length ? (
            <RecommendationList items={recommendations} />
          ) : (
            <EmptyState>
              Add skills and your graduation year to{" "}
              <Link href="/profile" className="text-arena-600 hover:underline">your profile</Link> to get matches.
            </EmptyState>
          )}
        </DashCard>
      </div>

      {/* Contests + submissions */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <DashCard
          title="Upcoming contests"
          icon={CalendarClock}
          delay={0.05}
          action={<span className="text-xs text-muted">{contests.joined} joined{contests.bestRank ? ` · best rank #${contests.bestRank}` : ""}</span>}
        >
          {contests.upcoming.length ? (
            <ul className="space-y-2">
              {contests.upcoming.map((c) => (
                <li key={c.id} className="relative flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-arena-200">
                  <span className="min-w-0">
                    <Link href={`/contests/${c.slug}`} className="block truncate text-sm font-medium after:absolute after:inset-0 hover:text-arena-800">{c.title}</Link>
                    <span className="block text-xs text-muted">
                      {c.problemCount} problems · {c.durationMinutes} min
                      {c.registered ? " · registered" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {c.live ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-2.5 py-0.5 text-xs text-danger-800">
                        <span className="size-1.5 animate-pulse rounded-full bg-danger-600" aria-hidden="true" /> Live now
                      </span>
                    ) : (
                      <>
                        <span className="block text-[11px] text-muted">starts in</span>
                        <Countdown startsAt={c.startsAt} className="font-mono text-sm tabular-nums" />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No contests scheduled right now.</EmptyState>
          )}
        </DashCard>
        <DashCard title="Recent submissions" icon={ListChecks} delay={0.08}>
          {coding.recent.length ? (
            <ul>
              {coding.recent.map((s) => (
                <Row key={s.id}>
                  <span className="min-w-0">
                    {s.slug ? (
                      <Link href={`/algoarena/${s.slug}`} className="block truncate hover:text-arena-800">{s.title}</Link>
                    ) : (
                      <span className="block truncate">{s.title}</span>
                    )}
                    <span className="block truncate text-xs text-muted">
                      <span className={DIFF_TONE[s.difficulty]}>{s.difficulty}</span> · {LANG[s.language] ?? s.language} · {relativeTime(s.at, generatedAt)}
                      {s.executionMode === "demo" ? " · sample" : ""}
                    </span>
                  </span>
                  <SubmissionStatus status={s.status} />
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState>No submissions yet.</EmptyState>
          )}
        </DashCard>
      </div>

      {/* Achievements + saved + activity */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
        <DashCard
          title="Achievements"
          icon={Trophy}
          tone="xp"
          delay={0.05}
          action={<Link href="/achievements" className="text-xs text-arena-600 hover:underline">{achievements.earnedCount} of {achievements.total} · see all</Link>}
        >
          {achievements.recent.length ? (
            <ul className="grid grid-cols-3 gap-2">
              {achievements.recent.map((a) => {
                const Icon = BADGE_ICONS[a.icon] ?? Award;
                return (
                  <li key={a.code} title={a.description} className="group flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-transform duration-300 ease-snap hover:-translate-y-1 hover:-rotate-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-xp-50 text-xp-700 transition-colors group-hover:bg-xp-200">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="text-[11px] leading-tight">{a.name}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState>Badges you earn will appear here.</EmptyState>
          )}
        </DashCard>
        <DashCard title="Saved opportunities" icon={Bookmark} tone="bridge" delay={0.08}>
          {saved.length ? (
            <ul>
              {saved.map((s) => (
                <Row key={s.id}>
                  <span className="min-w-0">
                    <Link href={`/skillbridge/${s.id}`} className="block truncate hover:text-bridge-800">{s.title}</Link>
                    <span className="block truncate text-xs text-muted">{s.companyName}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {s.closed ? "Closed" : s.deadline ? `Closes ${relativeTime(s.deadline, generatedAt)}` : "Open"}
                  </span>
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState>Opportunities you save will appear here.</EmptyState>
          )}
        </DashCard>
        <DashCard title="Recent activity" icon={Activity} delay={0.11}>
          {activity.length ? (
            <ol className="space-y-2.5">
              {activity.map((a, i) => {
                const Icon = ACTIVITY_ICONS[a.type] ?? Activity;
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-page text-muted">
                      <Icon size={13} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block leading-snug">{a.text}</span>
                      <span className="text-xs text-muted">
                        {relativeTime(a.at, generatedAt)}
                        {a.xp ? <span className="text-xp-700"> · +{a.xp} XP</span> : null}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState>Your activity will show up here.</EmptyState>
          )}
        </DashCard>
      </div>
    </div>
  );
}
