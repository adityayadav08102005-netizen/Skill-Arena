import { Check, Flame, Trophy } from "lucide-react";
import DemoBadge from "@/components/common/DemoBadge";
import NumberTicker from "@/components/common/NumberTicker";
import Reveal from "@/components/common/Reveal";
import SlideButton from "@/components/common/SlideButton";
import Countdown from "./Countdown";
import RotatingWord from "./RotatingWord";

// Decorative chips floating around the headline. They illustrate the product
// and are hidden from assistive tech; they are not data claims.
const CHIPS = [
  { label: "Accepted", icon: Check, className: "left-[4%] top-[30%] text-bridge-600", delay: "0s" },
  { label: "+30 XP", icon: Flame, className: "right-[6%] top-[24%] text-xp-700", delay: "0.8s" },
  { label: "94% match", icon: null, className: "right-[9%] top-[62%] text-bridge-600", delay: "1.5s" },
  { label: "Rank 27 ↑4", icon: Trophy, className: "left-[7%] top-[66%] text-arena-600", delay: "2.1s" },
];

export default function Hero({ data }) {
  const { counts, nextContest, mode } = data;
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-32 text-center sm:pt-36">
      {CHIPS.map(({ label, icon: Icon, className, delay }) => (
        <span
          key={label}
          aria-hidden="true"
          className={`absolute hidden items-center gap-1 rounded-full border border-line bg-panel px-3 py-1 text-xs shadow-sm lg:inline-flex ${className}`}
          style={{ animation: `sa-float 3.2s ease-in-out ${delay} infinite` }}
        >
          {Icon && <Icon size={13} />}
          {label}
        </span>
      ))}

      <div className="relative mx-auto max-w-3xl">
        {nextContest && (
          <Reveal>
            <span className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-arena-50 px-3.5 py-1 text-xs text-arena-800">
              {nextContest.title} starts in
              <Countdown
                startsAt={nextContest.startsAt}
                startsInHours={nextContest.startsInHours}
                className="font-mono tabular-nums"
              />
            </span>
          </Reveal>
        )}

        <Reveal delay={0.1}>
          <h1 className="mt-5 text-4xl font-medium leading-[1.1] tracking-tight sm:text-6xl">
            The arena where students
            <br />
            <RotatingWord words={["learn.", "code.", "compete.", "get hired."]} className="text-arena-600" />
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Practice problems, compete in contests, prove skills with assessments, and apply to jobs with one profile.
          </p>
        </Reveal>

        <Reveal delay={0.3} className="mt-8 flex flex-wrap justify-center gap-3">
          <SlideButton href="/algoarena" size="lg">
            Explore AlgoArena
          </SlideButton>
          <SlideButton href="#recruiters" variant="outline" size="lg">
            I&apos;m a recruiter
          </SlideButton>
        </Reveal>

        <Reveal delay={0.4} className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted">
          <span>
            <NumberTicker value={counts.problems} className="font-medium text-ink" /> coding problems
          </span>
          <span>
            <NumberTicker value={counts.openRoles} className="font-medium text-ink" /> open roles
          </span>
          <span>
            <NumberTicker value={counts.assessmentTracks} className="font-medium text-ink" /> skill assessments
          </span>
          {mode === "demo" && <DemoBadge />}
        </Reveal>
      </div>
    </section>
  );
}
