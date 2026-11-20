import { Briefcase, ClipboardCheck, Code2, Flame, Swords } from "lucide-react";
import DemoBadge from "@/components/common/DemoBadge";
import HoverCard from "@/components/common/HoverCard";
import Reveal from "@/components/common/Reveal";
import { MODE_LABEL, formatSalary } from "@/lib/utils/format";
import { XP_RULES, levelProgress } from "@/lib/utils/xp";
import Countdown from "./Countdown";

const DIFFICULTY_STYLE = {
  easy: "bg-bridge-50 text-bridge-800",
  medium: "bg-xp-50 text-xp-800",
  hard: "bg-danger-50 text-danger-800",
};

const WORK_MODE = MODE_LABEL;

/** Example of the level ring a student sees, using the real XP rules. */
const EXAMPLE_XP = 2200;

export default function Bento({ data }) {
  const { featuredProblem: problem, featuredOpportunity: job, nextContest, assessmentCategories, mode } = data;
  const example = levelProgress(EXAMPLE_XP);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <Reveal className="mb-8 text-center">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Everything in one arena</h2>
        <p className="mt-2 text-muted">Coding practice, contests, assessments and careers share one profile.</p>
      </Reveal>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        <Reveal delay={0.05} className="md:col-span-2">
          <HoverCard href="/algoarena" className="h-full scroll-mt-28" accent="arena">
            <div id="algoarena" className="scroll-mt-28" />
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-arena-600">
                <Code2 size={16} aria-hidden="true" /> AlgoArena
              </span>
              <span className="text-xs text-muted">Python · Java · C++ · JavaScript</span>
            </div>
            {problem && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{problem.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${DIFFICULTY_STYLE[problem.difficulty]}`}>
                    {problem.difficulty}
                  </span>
                  {problem.topics.map((t) => (
                    <span key={t} className="rounded-full bg-arena-50 px-2 py-0.5 text-[11px] text-arena-800">
                      {t}
                    </span>
                  ))}
                </div>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-page p-3 font-mono text-[13px] leading-relaxed">
                  <code>
                    <span className="text-arena-600">def</span> two_sum(nums, target):{"\n"}
                    {"    "}seen = {"{}"}{"\n"}
                    {"    "}<span className="text-arena-600">for</span> i, n <span className="text-arena-600">in</span> enumerate(nums):{"\n"}
                    {"        "}<span className="text-arena-600">if</span> target - n <span className="text-arena-600">in</span> seen:{" "}
                    <span className="text-bridge-600">…</span>
                  </code>
                </pre>
                <p className="mt-2 text-xs text-muted">
                  Run against sample tests, submit against hidden ones, and track every attempt.
                </p>
              </>
            )}
          </HoverCard>
        </Reveal>

        <Reveal delay={0.1}>
          <HoverCard className="h-full" accent="xp">
            <span className="inline-flex items-center gap-1.5 text-xp-700">
              <Flame size={16} aria-hidden="true" /> Streaks and XP
            </span>
            <div className="mt-3 text-2xl font-medium">Level {example.level}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-xp-50">
              <div className="h-full rounded-full bg-xp-400" style={{ width: `${example.percent}%` }} />
            </div>
            <div className="mt-1.5 text-xs text-muted">
              Example: {EXAMPLE_XP.toLocaleString("en-IN")} XP, {example.toNext.toLocaleString("en-IN")} to the next level
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted">
              <li>Easy / medium / hard solve: +{XP_RULES.problemSolved.easy} / +{XP_RULES.problemSolved.medium} / +{XP_RULES.problemSolved.hard} XP</li>
              <li>Daily challenge: +{XP_RULES.dailyChallengeBonus} XP</li>
              <li>XP is validated on the server</li>
            </ul>
          </HoverCard>
        </Reveal>

        <Reveal delay={0.15}>
          <HoverCard href="/assessments" className="h-full" accent="bridge">
            <div id="assessments" className="scroll-mt-28" />
            <span className="inline-flex items-center gap-1.5 text-bridge-600">
              <ClipboardCheck size={16} aria-hidden="true" /> Assessments
            </span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {assessmentCategories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-page px-2.5 py-1 text-xs transition-colors duration-200 hover:bg-bridge-50 hover:text-bridge-800"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Timed multiple-choice tests with answer review and topic-wise scores.</p>
          </HoverCard>
        </Reveal>

        <Reveal delay={0.2} className="md:col-span-2">
          <HoverCard href="/skillbridge" className="h-full" accent="bridge">
            <div id="skillbridge" className="scroll-mt-28" />
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-bridge-600">
                <Briefcase size={16} aria-hidden="true" /> SkillBridge
              </span>
              {mode === "demo" && <DemoBadge label="Sample listing" />}
            </div>
            {job && (
              <>
                <div className="mt-3 font-medium">{job.title}</div>
                <div className="text-sm text-muted">
                  {job.companyName} · {WORK_MODE[job.workMode]} · {job.location}
                  {formatSalary(job.salary) ? ` · ${formatSalary(job.salary)}` : ""}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((s) => (
                    <span key={s} className="rounded-lg border border-line px-2 py-0.5 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}
            <p className="mt-3 text-xs text-muted">
              Internships and jobs matched to your skills, education and graduation year, with application tracking.
            </p>
          </HoverCard>
        </Reveal>

        <Reveal delay={0.25} className="md:col-span-3">
          <HoverCard href="/contests" accent="arena">
            <div id="contests" className="scroll-mt-28" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-arena-600">
                  <Swords size={16} aria-hidden="true" /> Contests and leaderboards
                </span>
                <p className="mt-1 text-sm text-muted">
                  Weekly and monthly contests with live rankings, plus XP, weekly and monthly leaderboards.
                </p>
              </div>
              {nextContest && (
                <div className="text-right">
                  <div className="text-xs text-muted">
                    Next: {nextContest.title} · {nextContest.problemCount} problems · {nextContest.durationMinutes} min
                  </div>
                  <Countdown
                    startsAt={nextContest.startsAt}
                    startsInHours={nextContest.startsInHours}
                    className="font-mono text-2xl tabular-nums"
                  />
                </div>
              )}
            </div>
          </HoverCard>
        </Reveal>
      </div>
    </section>
  );
}
