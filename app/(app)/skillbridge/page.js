import { Briefcase, ListChecks } from "lucide-react";
import Link from "next/link";
import { after, connection } from "next/server";
import { Suspense } from "react";
import DemoBadge from "@/components/common/DemoBadge";
import Reveal from "@/components/common/Reveal";
import FilterBar from "@/components/skillbridge/FilterBar";
import OpportunityCard from "@/components/skillbridge/OpportunityCard";
import { getCurrentUser } from "@/lib/auth/session";
import { anySourceDue, syncDueSources } from "@/services/jobSync";
import { listOpportunities, parseFilters } from "@/services/opportunities";

export const metadata = { title: "SkillBridge" };

const EMPTY = {
  all: "No opportunities match these filters.",
  foryou: "No strong matches yet. Add skills, preferred roles and your graduation year to your profile.",
  saved: "You haven't saved anything yet. Use the bookmark on any listing.",
  applied: "You haven't applied anywhere yet.",
};

async function Board({ searchParams }) {
  await connection();
  const filters = parseFilters(await searchParams);
  const current = await getCurrentUser();
  const student = current?.user.role === "student" ? { id: current.user.id, profile: current.profile } : null;
  if (!student) filters.tab = "all";
  const data = await listOpportunities(filters, student);
  // Import fresh Remotive/Arbeitnow listings once they're due, after this response is sent.
  if (await anySourceDue()) after(() => syncDueSources({ trigger: "auto" }).catch((error) => console.error("job import failed", error)));
  const now = new Date();
  const more = new URLSearchParams(Object.entries({ ...filters, type: filters.type.join(","), mode: filters.mode.join(","), page: String(filters.page + 1) }).filter(([, v]) => v && v !== "all"));

  return (
    <div className="space-y-5">
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
              <Briefcase size={22} className="text-bridge-600" aria-hidden="true" /> SkillBridge
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Internships, jobs, freelance work and student projects{student ? ", matched to your skills and batch" : ""}.
              {data.mode === "demo" && <DemoBadge className="ml-2 align-middle" label="Sample listings" />}
            </p>
          </div>
          {student ? (
            <Link href="/applications" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-bridge-200">
              <ListChecks size={15} className="text-bridge-600" aria-hidden="true" /> My applications
            </Link>
          ) : (
            <p className="text-sm text-muted">
              <Link href="/login?next=%2Fskillbridge" className="text-bridge-600 hover:underline">Log in</Link> as a student to see your match and apply.
            </p>
          )}
        </header>
      </Reveal>

      <FilterBar filters={filters} counts={data.counts} signedInStudent={Boolean(student)} />

      <p className="text-xs text-muted">{data.total} {data.total === 1 ? "opportunity" : "opportunities"}</p>
      {data.items.length ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          {data.items.map((item, i) => <OpportunityCard key={item.id} item={item} index={i} signedInStudent={Boolean(student)} now={now} />)}
        </div>
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">{EMPTY[filters.tab]}</p>
      )}
      {data.hasMore && (
        <div className="text-center">
          <Link href={`/skillbridge?${more}`} scroll={false} className="inline-block rounded-full border border-line bg-panel px-5 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-bridge-200">
            Show more
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SkillBridgePage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Board searchParams={searchParams} />
    </Suspense>
  );
}
