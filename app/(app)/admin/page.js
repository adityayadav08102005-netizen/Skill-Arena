import { Activity, BarChart3, Briefcase, Building2, ClipboardList, Code2, Flag, GraduationCap, HelpCircle, History, PlugZap, ShieldCheck, Swords, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ReviewQueue from "@/components/admin/ReviewQueue";
import SignupsChart from "@/components/admin/SignupsChart";
import NumberTicker from "@/components/common/NumberTicker";
import Reveal from "@/components/common/Reveal";
import DashCard, { EmptyState, Row } from "@/components/dashboard/DashCard";
import { requireRole } from "@/lib/auth/session";
import { relativeTime } from "@/lib/utils/time";
import { adminOverview } from "@/services/admin";

export const metadata = { title: "Admin console" };

const MANAGE = [
  ["/admin/users", "Users and roles", Users],
  ["/admin/companies", "Companies", Building2],
  ["/admin/problems", "Problems", Code2],
  ["/admin/questions", "Question bank", HelpCircle],
  ["/admin/contests", "Contests", Swords],
  ["/admin/opportunities", "Listings", Briefcase],
  ["/admin/reports", "Reports", Flag],
  ["/admin/integrations", "Integrations", PlugZap],
];

async function Overview() {
  await requireRole(["admin"], { next: "/admin" });
  const data = await adminOverview();
  const { counts, activity } = data;
  const waiting = counts.pendingListings + counts.awaitingCompanies + counts.openReports;

  const tiles = [
    ["Students", counts.students, `+${counts.newStudents} this week`, GraduationCap, "/admin/users?role=student"],
    ["Recruiters", counts.recruiters, `${counts.awaitingCompanies} compan${counts.awaitingCompanies === 1 ? "y" : "ies"} awaiting verification`, Building2, "/admin/companies"],
    ["Problems", counts.problemsLive, `${counts.problemDrafts} draft${counts.problemDrafts === 1 ? "" : "s"}`, Code2, "/admin/problems"],
    ["Open roles", counts.openRoles, `${counts.pendingListings} pending review`, Briefcase, "/admin/opportunities"],
  ];

  return (
    <div className="space-y-5">
      <AdminHeader icon={ShieldCheck} title="Admin console" sub="Platform overview">
        {waiting > 0 ? (
          <Link href={counts.openReports ? "/admin/reports" : counts.pendingListings ? "/admin/opportunities" : "/admin/companies"} className="inline-flex items-center gap-1.5 rounded-full bg-xp-50 px-3 py-1.5 text-sm text-xp-800 transition-transform hover:-translate-y-0.5">
            <Flag size={14} aria-hidden="true" /> {waiting} item{waiting === 1 ? "" : "s"} need review
          </Link>
        ) : (
          <span className="rounded-full bg-bridge-50 px-3 py-1.5 text-sm text-bridge-800">All caught up</span>
        )}
      </AdminHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value, sub, Icon, href], i) => (
          <Reveal key={label} delay={i * 0.05}>
            <Link href={href} className="block h-full rounded-card border border-line bg-panel p-4 transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1 hover:border-arena-300">
              <div className="flex items-center gap-1.5 text-xs text-muted"><Icon size={14} aria-hidden="true" /> {label}</div>
              <div className="mt-1 text-2xl font-medium"><NumberTicker value={value} /></div>
              <div className="text-xs text-muted">{sub}</div>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DashCard title="New sign-ups · last 8 weeks" icon={BarChart3}>
          <SignupsChart data={data.signups} />
        </DashCard>
        <DashCard title="Manage" icon={ClipboardList} tone="bridge" delay={0.05}>
          <ul className="grid grid-cols-2 gap-2">
            {MANAGE.map(([href, label, Icon]) => (
              <li key={href}>
                <Link href={href} className="flex h-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm transition-[translate,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-bridge-200 hover:bg-bridge-50">
                  <Icon size={15} className="text-bridge-600" aria-hidden="true" /> {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {[
              ["Code submissions", activity.submissions],
              ["Assessments taken", activity.assessments],
              ["Applications", activity.applications],
              ["Contest entries", activity.contestEntries],
            ].map(([label, n]) => (
              <div key={label} className="rounded-xl bg-page px-3 py-2">
                <div className="text-muted">{label}</div>
                <div className="text-base font-medium text-ink">{n.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Activity in the last 30 days</p>
        </DashCard>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DashCard title="Review queue" icon={Activity} tone="xp">
          <ReviewQueue items={data.queue} />
        </DashCard>
        <DashCard title="Recent admin actions" icon={History} delay={0.05}>
          {data.audit.length ? (
            <ul>
              {data.audit.map((a) => (
                <Row key={a.id}>
                  <span className="min-w-0">
                    <span className="font-medium">{a.who}</span> {a.what}
                    {a.title && <span className="block truncate text-xs text-muted">{a.title}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{relativeTime(a.at)}</span>
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState>No admin actions yet.</EmptyState>
          )}
        </DashCard>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Overview />
    </Suspense>
  );
}
