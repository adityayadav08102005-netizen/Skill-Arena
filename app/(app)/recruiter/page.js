import { BadgeCheck, Briefcase, CalendarClock, Clock3, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import NumberTicker from "@/components/common/NumberTicker";
import Reveal from "@/components/common/Reveal";
import SlideButton from "@/components/common/SlideButton";
import DashCard, { EmptyState, Row } from "@/components/dashboard/DashCard";
import { ApplicationStatus } from "@/components/dashboard/StatusPill";
import { MissingCompany, withRecruiter } from "@/components/recruiter/RecruiterGate";
import { requireRole } from "@/lib/auth/session";
import { APP_TIMEZONE, relativeTime } from "@/lib/utils/time";
import { recruiterOverview } from "@/services/recruiter";

export const metadata = { title: "Recruiter" };

const FUNNEL = [
  ["applied", "Applied"],
  ["under_review", "Under review"],
  ["shortlisted", "Shortlisted"],
  ["interview_scheduled", "Interview"],
  ["selected", "Selected"],
];
const fmt = (d) => new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function Overview() {
  const { user } = await requireRole(["recruiter"], { next: "/recruiter" });
  const { data, missingCompany } = await withRecruiter(() => recruiterOverview(user));
  if (missingCompany) return <MissingCompany />;
  const max = Math.max(1, ...FUNNEL.map(([k]) => data.byStatus[k] ?? 0));
  const now = new Date();

  return (
    <div className="space-y-5">
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
              {data.company.name}
              {data.company.isVerified && <BadgeCheck size={20} className="text-bridge-600" aria-label="Verified company" />}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {data.company.isVerified ? "Verified company: new listings go live straight away." : "Unverified company: new listings are reviewed by an admin before they go live."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/recruiter/students" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-bridge-200">
              <Search size={15} aria-hidden="true" /> Find students
            </Link>
            <SlideButton href="/recruiter/listings/new" variant="bridge"><Plus size={15} aria-hidden="true" /> Post a listing</SlideButton>
          </div>
        </header>
      </Reveal>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Live listings", data.listings.live, `${data.listings.pending} pending · ${data.listings.drafts} drafts`, Briefcase],
          ["Applicants", data.applicants, `${data.newThisWeek} in the last 7 days`, Users],
          ["Shortlisted", data.byStatus.shortlisted ?? 0, `${data.byStatus.selected ?? 0} selected so far`, BadgeCheck],
          ["Interviews", data.byStatus.interview_scheduled ?? 0, `${data.interviews.length} upcoming`, CalendarClock],
        ].map(([label, value, sub, Icon], i) => (
          <DashCard key={label} tone="bridge" delay={i * 0.03}>
            <div className="flex items-center gap-1.5 text-xs text-muted"><Icon size={13} aria-hidden="true" /> {label}</div>
            <div className="mt-1 text-2xl font-medium tracking-tight"><NumberTicker value={value} /></div>
            <div className="text-xs text-muted">{sub}</div>
          </DashCard>
        ))}
      </div>

      <DashCard title="Pipeline" icon={Users} tone="bridge" delay={0.05}>
        <ul className="space-y-2.5">
          {FUNNEL.map(([key, label], i) => {
            const n = data.byStatus[key] ?? 0;
            return (
              <li key={key} className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                <span className="text-muted">{label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-bridge-50">
                  <span className="block h-full rounded-full bg-bridge-400 transition-[width] duration-1000 ease-snap" style={{ width: `${(n / max) * 100}%`, transitionDelay: `${i * 80}ms` }} />
                </span>
                <span className="text-right font-medium tabular-nums">{n}</span>
              </li>
            );
          })}
        </ul>
        {(data.byStatus.rejected || data.byStatus.withdrawn) && (
          <p className="mt-3 text-xs text-muted">{data.byStatus.rejected ?? 0} not selected · {data.byStatus.withdrawn ?? 0} withdrawn</p>
        )}
      </DashCard>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <DashCard title="Recent applicants" icon={Clock3} tone="bridge" delay={0.05}>
          {data.recent.length ? (
            <ul>
              {data.recent.map((a) => (
                <Row key={a.id}>
                  <Link href={`/recruiter/listings/${a.listingId}?candidate=${a.id}`} className="min-w-0 hover:text-bridge-800">
                    <span className="block truncate">{a.name}</span>
                    <span className="block truncate text-xs text-muted">{a.listing} · {relativeTime(a.appliedAt, now)}</span>
                  </Link>
                  <ApplicationStatus status={a.status} />
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState>No applications yet. Post a listing to start hiring.</EmptyState>
          )}
        </DashCard>
        <DashCard title="Upcoming interviews" icon={CalendarClock} tone="bridge" delay={0.08}>
          {data.interviews.length ? (
            <ul>
              {data.interviews.map((a) => (
                <Row key={a.id}>
                  <Link href={`/recruiter/listings/${a.listingId}?candidate=${a.id}`} className="min-w-0 hover:text-bridge-800">
                    <span className="block truncate">{a.name}</span>
                    <span className="block truncate text-xs text-muted">{a.listing}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-arena-800">{fmt(a.interviewAt)}</span>
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState>No interviews scheduled.</EmptyState>
          )}
        </DashCard>
      </div>
    </div>
  );
}

export default function RecruiterPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Overview />
    </Suspense>
  );
}
