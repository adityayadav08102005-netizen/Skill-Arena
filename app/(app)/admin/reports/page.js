import { Flag } from "lucide-react";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ReportsList from "@/components/admin/ReportsList";
import { LinkTabs } from "@/components/admin/shared";
import { requireRole } from "@/lib/auth/session";
import { listReports } from "@/services/admin";

export const metadata = { title: "Reports · Admin" };

const TABS = [
  { value: "", label: "Open" },
  { value: "actioned", label: "Taken down" },
  { value: "dismissed", label: "Dismissed" },
];

async function Content({ searchParams }) {
  await requireRole(["admin"], { next: "/admin/reports" });
  const params = await searchParams;
  const status = TABS.some((t) => t.value === params.status) ? params.status : "";
  const items = await listReports({ status: status || "open" });
  return (
    <div className="space-y-5">
      <AdminHeader icon={Flag} title="Reports" sub="Listings, profiles, problems and questions flagged by users, oldest first. Reporters hear back when you decide." />
      <LinkTabs tabs={TABS} active={status} ariaLabel="Report status" />
      <ReportsList items={items} />
    </div>
  );
}

export default function AdminReportsPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
