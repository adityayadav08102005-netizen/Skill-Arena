import { FileSearch, Filter, ListChecks } from "lucide-react";
import HoverCard from "@/components/common/HoverCard";
import Reveal from "@/components/common/Reveal";

const FEATURES = [
  { icon: Filter, title: "Filter by proven skill", body: "Search students by skills, XP, problems solved and assessment scores." },
  { icon: FileSearch, title: "See the work", body: "Open coding stats, assessment results, projects and resumes in one profile." },
  { icon: ListChecks, title: "Run the pipeline", body: "Move applicants from applied to shortlisted, interview and offer." },
];

const PIPELINE = [
  { stage: "Applied", tone: "bg-page text-muted" },
  { stage: "Under review", tone: "bg-info-50 text-info-800" },
  { stage: "Shortlisted", tone: "bg-bridge-50 text-bridge-800" },
  { stage: "Interview", tone: "bg-arena-50 text-arena-800" },
  { stage: "Selected", tone: "bg-xp-50 text-xp-800" },
];

export default function RecruiterSection() {
  return (
    <section id="recruiters" className="scroll-mt-28 bg-panel py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="max-w-2xl">
          <span className="text-sm text-bridge-600">For recruiters</span>
          <h2 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">Hire students by what they can do</h2>
          <p className="mt-2 text-muted">
            Post internships and jobs, then review applicants with their coding and assessment performance alongside the resume.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <HoverCard accent="bridge" className="h-full bg-page">
                <span className="flex size-9 items-center justify-center rounded-xl bg-bridge-50 text-bridge-600">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </HoverCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Application stages">
            {PIPELINE.map(({ stage, tone }, i) => (
              <li key={stage} className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 transition-transform duration-200 hover:-translate-y-0.5 ${tone}`}>{stage}</span>
                {i < PIPELINE.length - 1 && <span className="text-muted" aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
