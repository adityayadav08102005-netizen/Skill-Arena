import { BadgeCheck, Briefcase, Code2, Download, ExternalLink, Flame, GraduationCap, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/app/Avatar";
import HoverCard from "@/components/common/HoverCard";
import Reveal from "@/components/common/Reveal";

const LEVEL_LABEL = ["Beginner", "Basic", "Comfortable", "Strong", "Expert"];
const fmtMonth = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : null);

function Section({ title, icon: Icon, children, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <section className="rounded-card border border-line bg-panel p-5">
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-medium">
          <Icon size={17} className="text-arena-600" aria-hidden="true" /> {title}
        </h2>
        {children}
      </section>
    </Reveal>
  );
}

export default function PublicProfile({ profile: p, canDownloadResume }) {
  const student = p.role === "student";
  return (
    <div className="space-y-4">
      {p.isOwner && (
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-arena-50 px-4 py-3 text-sm text-arena-800">
            This is how other people see your profile.
            <Link href="/profile" className="inline-flex items-center gap-1 font-medium hover:underline">
              <Pencil size={14} aria-hidden="true" /> Edit profile
            </Link>
          </div>
        </Reveal>
      )}

      <Reveal>
        <header className="rounded-card border border-line bg-panel p-6">
          <div className="flex flex-wrap items-start gap-5">
            <Avatar userId={p.userId} name={p.fullName} image={p.image} hasAvatar={p.hasAvatar} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-medium tracking-tight">{p.fullName}</h1>
              {student ? (
                p.headline && <p className="mt-0.5 text-muted">{p.headline}</p>
              ) : (
                <p className="mt-0.5 inline-flex items-center gap-1 text-muted">
                  {p.jobTitle}
                  {p.company && <> at {p.company.name}</>}
                  {p.company?.isVerified && <BadgeCheck size={15} className="text-bridge-600" aria-label="Verified company" />}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                {student && p.college && (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap size={14} aria-hidden="true" />
                    {[p.degree, p.department].filter(Boolean).join(", ")}
                    {p.degree || p.department ? " · " : ""}
                    {p.college}
                    {p.graduationYear ? ` · ${p.graduationYear}` : ""}
                  </span>
                )}
                {p.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} aria-hidden="true" /> {p.location}
                  </span>
                )}
                {p.email && <span>{p.email}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {p.githubUsername && <ExtLink href={`https://github.com/${p.githubUsername}`}>GitHub</ExtLink>}
                {p.linkedinUrl && <ExtLink href={p.linkedinUrl}>LinkedIn</ExtLink>}
                {student && p.codeforcesHandle && <ExtLink href={`https://codeforces.com/profile/${p.codeforcesHandle}`}>Codeforces</ExtLink>}
                {canDownloadResume && (
                  <a href={`/api/files/resume/${p.userId}`} className="inline-flex items-center gap-1 rounded-full bg-arena-600 px-3 py-1 text-white transition-transform hover:-translate-y-0.5">
                    <Download size={14} aria-hidden="true" /> Resume
                  </a>
                )}
              </div>
            </div>
            {student && p.showCodingStats && (
              <dl className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Level" value={p.level} />
                <Stat label="XP" value={p.xp.toLocaleString("en-IN")} />
                <Stat label="Streak" value={<span className="inline-flex items-center gap-0.5"><Flame size={14} className="text-xp-600" aria-hidden="true" />{p.streak?.current ?? 0}</span>} />
              </dl>
            )}
          </div>
          {p.bio && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{p.bio}</p>}
          {student && p.preferredRoles?.length > 0 && (
            <p className="mt-3 text-sm text-muted">Looking for: {p.preferredRoles.join(", ")}</p>
          )}
        </header>
      </Reveal>

      {student && p.skills?.length > 0 && (
        <Section title="Skills" icon={Code2} delay={0.05}>
          <ul className="flex flex-wrap gap-2">
            {p.skills.map((s) => (
              <li key={s.name} title={LEVEL_LABEL[s.proficiency - 1]} className="group rounded-full border border-line px-3 py-1 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-arena-300">
                {s.name}
                <span className="ml-2 inline-flex gap-0.5 align-middle" aria-label={LEVEL_LABEL[s.proficiency - 1]}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`size-1.5 rounded-full ${i <= s.proficiency ? "bg-arena-600" : "bg-arena-50"}`} />
                  ))}
                </span>
                {s.verified && <BadgeCheck size={13} className="ml-1 inline text-bridge-600" aria-label="Verified by assessment" />}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {student && p.projects?.length > 0 && (
        <Section title="Projects" icon={Code2} delay={0.1}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {p.projects.map((proj) => (
              <HoverCard key={proj._id ?? proj.title} className="bg-page">
                <h3 className="font-medium">{proj.title}</h3>
                {proj.description && <p className="mt-1 text-sm text-muted">{proj.description}</p>}
                {proj.techStack?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {proj.techStack.map((t) => <span key={t} className="rounded-md bg-panel px-1.5 py-0.5 text-xs">{t}</span>)}
                  </div>
                )}
                <div className="mt-2 flex gap-3 text-sm">
                  {proj.repoUrl && <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-arena-600 hover:underline">Code</a>}
                  {proj.liveUrl && <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-arena-600 hover:underline">Live</a>}
                </div>
              </HoverCard>
            ))}
          </div>
        </Section>
      )}

      {student && p.experience?.length > 0 && (
        <Section title="Experience" icon={Briefcase} delay={0.15}>
          <Timeline
            items={p.experience.map((e) => ({
              key: e._id ?? e.title,
              title: `${e.title} · ${e.organization}`,
              meta: [fmtMonth(e.startDate), e.endDate ? fmtMonth(e.endDate) : e.startDate ? "Present" : null].filter(Boolean).join(" – "),
              body: e.description,
            }))}
          />
        </Section>
      )}

      {student && p.education?.length > 0 && (
        <Section title="Education" icon={GraduationCap} delay={0.2}>
          <Timeline
            items={p.education.map((e) => ({
              key: e._id ?? e.institution,
              title: e.institution,
              meta: [[e.degree, e.fieldOfStudy].filter(Boolean).join(", "), [e.startYear, e.endYear].filter(Boolean).join(" – "), e.grade].filter(Boolean).join(" · "),
            }))}
          />
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-16 rounded-xl bg-page px-3 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-lg font-medium">{value}</dd>
    </div>
  );
}

function ExtLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 transition-colors hover:border-arena-300 hover:text-arena-800">
      {children} <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

function Timeline({ items }) {
  return (
    <ol className="relative space-y-4 border-l border-arena-50 pl-5">
      {items.map((item) => (
        <li key={item.key} className="relative">
          <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-panel bg-arena-600" aria-hidden="true" />
          <div className="font-medium">{item.title}</div>
          {item.meta && <div className="text-sm text-muted">{item.meta}</div>}
          {item.body && <p className="mt-1 whitespace-pre-line text-sm">{item.body}</p>}
        </li>
      ))}
    </ol>
  );
}
