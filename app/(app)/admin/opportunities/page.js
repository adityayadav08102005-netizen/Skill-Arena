import { Briefcase } from "lucide-react";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ListingModeration from "@/components/admin/ListingModeration";
import { FilterBar, LinkTabs } from "@/components/admin/shared";
import { requireRole } from "@/lib/auth/session";
import { listListingsForModeration } from "@/services/admin";

export const metadata = { title: "Listings · Admin" };

const TABS = [
  { value: "", label: "Pending review" },
  { value: "published", label: "Live" },
  { value: "rejected", label: "Sent back" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

async function Content({ searchParams }) {
  await requireRole(["admin"], { next: "/admin/opportunities" });
  const params = await searchParams;
  const status = TABS.some((t) => t.value === params.status) ? params.status : "";
  const q = String(params.q ?? "").trim();
  const items = await listListingsForModeration({ status: status || "pending_review", q });
  return (
    <div className="space-y-5">
      <AdminHeader icon={Briefcase} title="Listings" sub="Approve listings from unverified companies, send them back with a note, or take down live ones. Recruiters are notified either way." />
      <div className="flex flex-wrap items-center gap-3">
        <LinkTabs tabs={TABS} active={status} ariaLabel="Listing status" />
        <div className="min-w-64 flex-1"><FilterBar values={{ q }} placeholder="Search title or company" /></div>
      </div>
      <ListingModeration items={items} />
    </div>
  );
}

export default function AdminListingsPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
