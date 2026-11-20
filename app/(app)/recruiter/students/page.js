import { BadgeCheck, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import Avatar from "@/components/app/Avatar";
import Reveal from "@/components/common/Reveal";
import StudentSearch from "@/components/recruiter/StudentSearch";
import { requireRole } from "@/lib/auth/session";
import { Skill } from "@/lib/db/models";
import { parseStudentFilters, searchStudents } from "@/services/candidates";

export const metadata = { title: "Find students" };

async function Results({ searchParams }) {
  await requireRole(["recruiter", "admin"], { next: "/recruiter/students" });
  const filters = parseStudentFilters(await searchParams);
  const [data, skills] = await Promise.all([searchStudents(filters), Skill.find({}, { name: 1 }).sort({ name: 1 }).lean()]);
  const more = new URLSearchParams(Object.entries({ ...filters, skills: filters.skills.join(","), verified: filters.verified ? "1" : "", page: String(filters.page + 1) }).filter(([, v]) => v && v !== "0" && v !== "xp"));

  return (
    <div className="space-y-5">
      <Reveal>
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
            <Users size={22} className="text-bridge-600" aria-hidden="true" /> Find students
          </h1>
          <p className="mt-0.5 text-sm text-muted">Students with public profiles. Sections a student keeps private stay hidden here.</p>
        </header>
      </Reveal>
      <StudentSearch filters={filters} skillOptions={skills.map((s) => s.name)} />
      <p className="text-xs text-muted">{data.total} student{data.total === 1 ? "" : "s"}</p>
      {data.items.length ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((s) => {
            const verified = s.skills.filter((k) => k.verified);
            const wanted = new Set(filters.skills.map((x) => x.toLowerCase()));
            return (
              <li key={s.userId}>
                <Link href={`/recruiter/students/${s.userId}`} className="group block h-full rounded-card border border-line bg-panel p-4 transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1 hover:border-bridge-200">
                  <div className="flex items-center gap-3">
                    <Avatar userId={s.userId} name={s.fullName} hasAvatar={s.hasAvatar} image={s.image} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate font-medium group-hover:text-bridge-800">{s.fullName}</div>
                      <div className="truncate text-xs text-muted">{s.college}{s.graduationYear ? ` · ${s.graduationYear}` : ""}</div>
                    </div>
                  </div>
                  {s.headline && <p className="mt-2 line-clamp-2 text-xs text-muted">{s.headline}</p>}
                  <div className="mt-3 flex flex-wrap gap-1 text-[11px]">
                    <span className="rounded-full bg-arena-50 px-2 py-0.5 text-arena-800">Lv {s.level}</span>
                    {s.coding.solved !== null && <span className="rounded-full bg-page px-2 py-0.5 text-muted">{s.coding.solved} solved</span>}
                    {s.assessments.best !== null && <span className="rounded-full bg-page px-2 py-0.5 text-muted">best test {s.assessments.best}%</span>}
                    {verified.length > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-bridge-50 px-2 py-0.5 text-bridge-800"><BadgeCheck size={11} aria-hidden="true" /> {verified.length} verified</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.skills.slice(0, 8).map((k) => (
                      <span key={k.name} className={`rounded-md border px-1.5 py-0.5 text-[11px] ${wanted.has(k.name.toLowerCase()) ? "border-bridge-200 text-bridge-800" : "border-line text-muted"}`}>{k.name}</span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No students match these filters.</p>
      )}
      {data.hasMore && (
        <div className="text-center">
          <Link href={`/recruiter/students?${more}`} scroll={false} className="inline-block rounded-full border border-line bg-panel px-5 py-2 text-sm hover:border-bridge-200">Show more</Link>
        </div>
      )}
    </div>
  );
}

export default function StudentsPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}
