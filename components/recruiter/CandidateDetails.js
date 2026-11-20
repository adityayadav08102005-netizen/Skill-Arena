import { BadgeCheck, Code2, ExternalLink, GraduationCap, Lock, MapPin } from "lucide-react";
import Avatar from "@/components/app/Avatar";
import { cn } from "@/lib/utils/cn";

const LEVEL_TONE = { Expert: "bg-xp-50 text-xp-800", Advanced: "bg-bridge-50 text-bridge-800", Intermediate: "bg-info-50 text-info-800", Beginner: "bg-page text-muted" };

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-page px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-lg font-medium">{value ?? "–"}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function Hidden({ what }) {
  return <p className="inline-flex items-center gap-1.5 text-xs text-muted"><Lock size={12} aria-hidden="true" /> The student keeps their {what} private.</p>;
}

/** Recruiter view of a candidate: stats, assessments, skills, projects, education, links. Pure render (server or client). */
export default function CandidateDetails({ c, compact = false }) {
  if (!c) return <p className="text-sm text-muted">This candidate&apos;s profile is no longer available.</p>;
  const verified = c.skills.filter((s) => s.verified);
  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-start gap-3">
        <Avatar userId={c.userId} name={c.fullName} hasAvatar={c.hasAvatar} image={c.image} size={compact ? "md" : "lg"} />
        <div className="min-w-0">
          <h2 className="text-lg font-medium leading-tight">{c.fullName}</h2>
          {c.headline && <p className="text-muted">{c.headline}</p>}
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            {c.college && <span className="inline-flex items-center gap-1"><GraduationCap size={12} aria-hidden="true" />{[c.degree, c.department].filter(Boolean).join(", ")}{c.degree || c.department ? " · " : ""}{c.college}{c.graduationYear ? ` · ${c.graduationYear}` : ""}</span>}
            {c.location && <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{c.location}</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {c.githubUsername && <a href={`https://github.com/${c.githubUsername}`} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 hover:border-arena-300">GitHub <ExternalLink size={11} aria-hidden="true" /></a>}
            {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 hover:border-arena-300">LinkedIn <ExternalLink size={11} aria-hidden="true" /></a>}
            {c.codeforcesHandle && <a href={`https://codeforces.com/profile/${c.codeforcesHandle}`} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 hover:border-arena-300">Codeforces <ExternalLink size={11} aria-hidden="true" /></a>}
          </div>
        </div>
      </div>

      <section>
        <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted"><Code2 size={13} aria-hidden="true" /> Coding</h3>
        {c.codingVisible ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Level" value={c.level} sub={`${c.xp.toLocaleString("en-IN")} XP`} />
            <Stat label="Solved" value={c.coding.solved} sub={c.coding.byDifficulty ? `E ${c.coding.byDifficulty.easy} · M ${c.coding.byDifficulty.medium} · H ${c.coding.byDifficulty.hard}` : null} />
            <Stat label="Accuracy" value={c.coding.accuracy === null ? "–" : `${c.coding.accuracy}%`} sub={`${c.coding.submissions} submissions`} />
            <Stat label="Contests" value={c.coding.contests} sub={c.coding.bestRank ? `best #${c.coding.bestRank} · streak ${c.streak.longest}` : `longest streak ${c.streak.longest}`} />
          </div>
        ) : (
          <Hidden what="coding statistics" />
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium text-muted">Assessment scores</h3>
        {c.assessmentsVisible ? (
          c.assessments.byCategory.length ? (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-2">
              {c.assessments.byCategory.map((a) => (
                <li key={a.category} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5">
                  <span className="truncate">{a.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px]", LEVEL_TONE[a.level])}>{a.level}</span>
                    <span className="font-medium">{a.best}%</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No assessments taken yet.</p>
          )
        ) : (
          <Hidden what="assessment scores" />
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium text-muted">Skills{verified.length ? ` · ${verified.length} verified by assessment` : ""}</h3>
        <ul className="flex flex-wrap gap-1.5">
          {c.skills.map((s) => (
            <li key={s.name} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs", s.verified ? "border-bridge-200 bg-bridge-50 text-bridge-800" : "border-line")}>
              {s.name}
              <span className="text-muted">{s.proficiency}/5</span>
              {s.verified && <BadgeCheck size={12} aria-label="Verified" />}
            </li>
          ))}
          {!c.skills.length && <li className="text-xs text-muted">No skills listed.</li>}
        </ul>
      </section>

      {!compact && c.bio && <section><h3 className="mb-1 text-xs font-medium text-muted">About</h3><p className="whitespace-pre-line">{c.bio}</p></section>}

      {c.projects.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium text-muted">Projects</h3>
          <ul className="space-y-2">
            {c.projects.map((p, i) => (
              <li key={i} className="rounded-lg border border-line px-3 py-2">
                <div className="font-medium">{p.title}</div>
                {p.description && <p className="text-xs text-muted">{p.description}</p>}
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {(p.techStack ?? []).map((t) => <span key={t} className="rounded bg-page px-1.5">{t}</span>)}
                  {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-arena-600 hover:underline">Code</a>}
                  {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-arena-600 hover:underline">Live</a>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(c.experience.length > 0 || c.education.length > 0) && (
        <section className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {c.experience.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-medium text-muted">Experience</h3>
              <ul className="space-y-1.5">{c.experience.map((e, i) => <li key={i}><span className="font-medium">{e.title}</span> · {e.organization}</li>)}</ul>
            </div>
          )}
          {c.education.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-medium text-muted">Education</h3>
              <ul className="space-y-1.5">{c.education.map((e, i) => <li key={i}><span className="font-medium">{e.institution}</span>{e.degree ? ` · ${e.degree}` : ""}{e.endYear ? ` · ${e.endYear}` : ""}</li>)}</ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
