import { Link2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import ExternalStats from "@/components/profile/ExternalStats";
import DashboardView from "@/components/dashboard/DashboardView";
import { requireRole } from "@/lib/auth/session";
import { ensureContestReminders } from "@/services/contests";
import { getStudentDashboard } from "@/services/dashboard";
import { getExternalStats } from "@/services/externalProfiles";

export const metadata = { title: "Dashboard" };

async function Dashboard() {
  const { user, profile } = await requireRole(["student"], { next: "/dashboard" });
  await ensureContestReminders(user.id);
  const data = await getStudentDashboard(user, profile);
  return (
    <>
      <DashboardView data={data} />
      {/* Third-party stats load on their own so a slow GitHub or Codeforces never holds up the dashboard. */}
      <Suspense fallback={<div className="mt-4 h-48 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
        <External userId={user.id} profile={profile} />
      </Suspense>
    </>
  );
}

async function External({ userId, profile }) {
  const stats = await getExternalStats(userId, profile);
  if (!stats.github && !stats.codeforces) {
    return (
      <Link href="/profile" className="mt-4 flex items-center gap-2 rounded-card border border-dashed border-line px-4 py-3 text-sm text-muted transition-colors hover:border-arena-300 hover:text-ink">
        <Link2 size={15} aria-hidden="true" /> Add your GitHub username and Codeforces handle to your profile to show your repositories and rating here and to recruiters.
      </Link>
    );
  }
  return <ExternalStats stats={stats} owner className="mt-4" />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-12 w-72 animate-pulse rounded-xl bg-panel" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-card bg-panel" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-60 animate-pulse rounded-card bg-panel" />
        <div className="h-60 animate-pulse rounded-card bg-panel" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
