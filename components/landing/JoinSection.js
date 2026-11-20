import { Building2, Database, GraduationCap } from "lucide-react";
import HoverCard from "@/components/common/HoverCard";
import Reveal from "@/components/common/Reveal";
import SlideButton from "@/components/common/SlideButton";

const ROLES = [
  {
    icon: GraduationCap,
    title: "Students",
    role: "student",
    accent: "arena",
    tone: "bg-arena-50 text-arena-600",
    points: ["Practice problems and daily challenges", "Contests, XP, badges and streaks", "Skill assessments with review", "Matched internships and jobs"],
  },
  {
    icon: Building2,
    title: "Recruiters",
    role: "recruiter",
    accent: "bridge",
    tone: "bg-bridge-50 text-bridge-600",
    points: ["Company profile and listings", "Applicants with coding and test scores", "Shortlist, interview and select", "Notifications on new applications"],
  },
];

/**
 * Who SkillArena is for, with a sign-up button per role. In demo mode there is
 * no database to hold accounts, so the section also says so plainly (the
 * sign-up page shows the same notice).
 */
export default function JoinSection({ mode }) {
  return (
    <section id="join" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-20">
      <Reveal className="text-center">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">One account, two ways in</h2>
        <p className="mt-2 text-muted">Sign in with Google or email, then choose how you use SkillArena.</p>
      </Reveal>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        {ROLES.map(({ icon: Icon, title, role, accent, tone, points }, i) => (
          <Reveal key={title} delay={i * 0.08}>
            <HoverCard accent={accent} className="h-full p-6">
              <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-xl font-medium">{title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
              <SlideButton href={`/register?role=${role}`} variant={accent === "bridge" ? "bridge" : "primary"} className="mt-5">
                Join as a {role}
              </SlideButton>
            </HoverCard>
          </Reveal>
        ))}
      </div>

      {mode === "demo" && (
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 flex max-w-xl items-start justify-center gap-2 rounded-card bg-xp-50 px-4 py-3 text-sm text-xp-800">
            <Database size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            This site is running in demo mode. Accounts need a connected MongoDB database; see the README to connect one.
          </p>
        </Reveal>
      )}
    </section>
  );
}
