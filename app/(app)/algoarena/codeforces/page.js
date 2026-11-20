import { ChevronLeft, ChevronRight, Code2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { after, connection } from "next/server";
import { Suspense } from "react";
import ArenaTabs from "@/components/algoarena/ArenaTabs";
import CfFilters from "@/components/algoarena/CfFilters";
import DemoBadge from "@/components/common/DemoBadge";
import Reveal from "@/components/common/Reveal";
import TimeAgo from "@/components/common/TimeAgo";
import { cn } from "@/lib/utils/cn";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { cfProblemsDue, listCfProblems, parseCfFilters, syncCodeforcesProblems } from "@/services/codeforcesProblems";

export const metadata = { title: "Codeforces practice" };

/** Badge colour by rating band (roughly Codeforces' own bands). */
function ratingClass(rating) {
  if (!rating) return "bg-page text-muted";
  if (rating < 1200) return "bg-bridge-50 text-bridge-800";
  if (rating < 1600) return "bg-info-50 text-info-800";
  if (rating < 2000) return "bg-arena-50 text-arena-800";
  if (rating < 2400) return "bg-xp-50 text-xp-800";
  return "bg-danger-50 text-danger-800";
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function pageHref(filters, page) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, page })) {
    if (v === null || v === "" || (k === "sort" && v === "solved") || (k === "page" && v === 0)) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return `/algoarena/codeforces${qs ? `?${qs}` : ""}`;
}

async function Practice({ searchParams }) {
  await connection();
  const demo = !isDatabaseConfigured();
  const filters = parseCfFilters(await searchParams);
  // The problem set is refreshed at most once a day, after the page is sent.
  if (!demo && (await cfProblemsDue())) after(() => syncCodeforcesProblems().catch((error) => console.error("Codeforces sync failed", error)));
  const data = await listCfProblems(filters);
  const filtered = Boolean(filters.q || filters.min || filters.max || filters.tag);

  return (
    <div className="space-y-5">
      <Reveal>
        <header className="space-y-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
              <Code2 size={22} className="text-arena-600" aria-hidden="true" /> Codeforces practice
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Find Codeforces problems by rating and topic, then solve them on Codeforces.
              {demo && <DemoBadge className="ml-2 align-middle" label="Connect a database to load the problem set" />}
            </p>
          </div>
          <ArenaTabs />
        </header>
      </Reveal>

      {!demo && <CfFilters filters={filters} tags={data.tags} />}

      {data.items.length ? (
        <>
          <p className="text-xs text-muted">
            {data.total.toLocaleString("en-IN")} problem{data.total === 1 ? "" : "s"} · page {filters.page + 1} of {Math.max(1, Math.ceil(data.total / 30))}
          </p>
          <ul className="grid gap-2">
            {data.items.map((p, i) => (
              <Reveal key={p.key} delay={Math.min(i * 0.02, 0.25)} as="li">
                <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line bg-panel px-3.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-arena-200 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto_auto]">
                  <span className={cn("rounded-lg px-1.5 py-0.5 text-center text-xs tabular-nums", ratingClass(p.rating))}>
                    {p.rating ?? "—"}
                    <span className="sr-only">{p.rating ? " rating" : " unrated"}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.key} · {p.name}</p>
                    <p className="truncate text-xs text-muted">{p.tags.length ? p.tags.join(" · ") : "no tags"}</p>
                  </div>
                  <span className="hidden text-xs text-muted sm:block">{compact.format(p.solvedCount)} solved</span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-sm text-arena-600 transition-colors hover:bg-arena-50 hover:text-arena-800"
                  >
                    Solve <ExternalLink size={13} aria-hidden="true" />
                    <span className="sr-only">{p.name} on Codeforces</span>
                  </a>
                </div>
              </Reveal>
            ))}
          </ul>
          {(filters.page > 0 || data.hasMore) && (
            <nav aria-label="Pages" className="flex items-center justify-center gap-2">
              {filters.page > 0 && (
                <Link href={pageHref(filters, filters.page - 1)} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3 py-1.5 text-sm transition-colors hover:border-arena-200">
                  <ChevronLeft size={14} aria-hidden="true" /> Previous
                </Link>
              )}
              {data.hasMore && (
                <Link href={pageHref(filters, filters.page + 1)} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3 py-1.5 text-sm transition-colors hover:border-arena-200">
                  Next <ChevronRight size={14} aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          {demo
            ? "The Codeforces problem list loads once a database is connected."
            : filtered
              ? "No problems match these filters."
              : data.error
                ? "Codeforces couldn't be reached. The list will load on the next try; refresh in a few minutes."
                : "Loading the Codeforces problem set for the first time. Refresh in a minute."}
        </p>
      )}

      <p className="text-[11px] text-muted">
        Problem names, ratings and tags from Codeforces&apos; public API
        {data.syncedAt && <> · updated <TimeAgo date={data.syncedAt} /></>}. Problems open on Codeforces; they aren&apos;t judged or scored in SkillArena.
      </p>
    </div>
  );
}

export default function CodeforcesPracticePage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Practice searchParams={searchParams} />
    </Suspense>
  );
}
