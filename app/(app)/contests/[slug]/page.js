import { ArrowLeft, CheckCircle2, CircleDashed, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import DifficultyBadge from "@/components/algoarena/DifficultyBadge";
import Reveal from "@/components/common/Reveal";
import { StatePill, fmtDateTime } from "@/components/contests/ContestCard";
import RegisterButton from "@/components/contests/RegisterButton";
import Standings from "@/components/contests/Standings";
import Countdown from "@/components/landing/Countdown";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { ContestError, getContest, getStandings } from "@/services/contests";

export const metadata = { title: "Contest" };

async function ContestView({ params }) {
  await connection();
  if (!isDatabaseConfigured()) notFound();
  const { slug } = await params;
  const current = await getCurrentUser();
  const student = current?.user.role === "student" ? current.user : null;
  let contest;
  try {
    contest = await getContest(slug, student);
  } catch (error) {
    if (error instanceof ContestError && error.status === 404) notFound();
    throw error;
  }
  const standings = contest.state === "upcoming" ? null : await getStandings(slug, student?.id);
  const viewer = { signedIn: Boolean(current), role: current?.user.role ?? null };
  const live = contest.state === "live";

  return (
    <div className="space-y-5">
      <Link href="/contests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden="true" /> Contests
      </Link>

      {/* Floating timer bar */}
      <Reveal>
        <div className="sticky top-16 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full border border-line bg-panel/95 px-5 py-2 text-sm shadow-float backdrop-blur-md">
          <StatePill state={contest.state} />
          <span className="font-medium">{contest.title}</span>
          {contest.state === "upcoming" && <span className="text-muted">starts in <Countdown startsAt={contest.startsAt} className="font-mono tabular-nums text-ink" /></span>}
          {live && <span className="text-muted">ends in <Countdown startsAt={contest.endsAt} className="font-mono tabular-nums text-ink" /></span>}
          {contest.me && contest.state !== "upcoming" && (
            <span className="rounded-full bg-arena-50 px-2.5 py-0.5 text-arena-800">
              Your score <span className="font-medium">{contest.me.score}</span>{contest.me.rank ? ` · #${contest.me.rank}` : ""}
            </span>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-panel p-5">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-2xl font-medium tracking-tight">{contest.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {fmtDateTime(contest.startsAt)} – {fmtDateTime(contest.endsAt)} · {contest.durationMinutes} min · {contest.problemCount} problems · {contest.totalPoints} points · {contest.participants} registered
            </p>
            {contest.description && <p className="mt-3 text-sm leading-relaxed">{contest.description}</p>}
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-page px-3 py-2 text-xs text-muted">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Each problem scores its points the first time it&apos;s accepted. Penalty = minutes until that accept + {contest.penaltyMinutesPerWrong} minutes per earlier wrong attempt. Ties go to the lower penalty.
            </p>
          </div>
          <RegisterButton slug={contest.slug} registered={contest.registered} state={contest.state} viewer={viewer} />
        </section>
      </Reveal>

      {contest.state === "upcoming" ? (
        <Reveal delay={0.1}>
          <section className="rounded-card border border-dashed border-arena-200 bg-arena-50/40 px-6 py-10 text-center">
            <p className="text-sm text-muted">Problems unlock when the contest starts in</p>
            <Countdown startsAt={contest.startsAt} className="mt-1 block font-mono text-4xl tabular-nums tracking-tight" />
            {contest.registered && <p className="mt-2 text-sm text-bridge-600">You&apos;re registered. We&apos;ll remind you a day before.</p>}
          </section>
        </Reveal>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Reveal delay={0.1}>
            <section className="rounded-card border border-line bg-panel p-4">
              <h2 className="mb-3 text-sm font-medium">Problems</h2>
              <ul className="space-y-1">
                {contest.problems.map((p) => (
                  <li key={p.label}>
                    <Link
                      href={live ? `/contests/${contest.slug}/${p.slug}` : `/algoarena/${p.slug}`}
                      className="group grid grid-cols-[1.5rem_1.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2.5 text-sm transition-[background-color,padding] duration-200 hover:bg-page hover:pl-3.5"
                    >
                      <span className="font-mono text-muted">{p.label}</span>
                      <span aria-label={p.solved ? "Solved" : p.attempts ? "Attempted" : "Not attempted"}>
                        {p.solved ? <CheckCircle2 size={17} className="text-bridge-600" /> : p.attempts ? <CircleDashed size={17} className="text-xp-600" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium group-hover:text-arena-800">{p.title}</span>
                        <span className="text-xs text-muted">{p.attempts ? `${p.attempts} attempt${p.attempts === 1 ? "" : "s"}` : "No attempts"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <DifficultyBadge difficulty={p.difficulty} />
                        <span className="w-14 text-right font-medium tabular-nums">{p.points} pts</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {!live && <p className="mt-3 text-xs text-muted">The contest is over. Problems open in AlgoArena for practice; they don&apos;t change the standings.</p>}
              {live && !contest.registered && student && <p className="mt-3 text-xs text-xp-700">Join the contest to submit. You can still read the problems.</p>}
            </section>
          </Reveal>
          <Reveal delay={0.15}>
            <Standings slug={contest.slug} initial={standings} live={live} />
          </Reveal>
        </div>
      )}
    </div>
  );
}

export default function ContestPage({ params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <ContestView params={params} />
    </Suspense>
  );
}
