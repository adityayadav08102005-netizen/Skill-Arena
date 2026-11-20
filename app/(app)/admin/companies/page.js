import { Building2 } from "lucide-react";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import CompaniesList from "@/components/admin/CompaniesList";
import { FilterBar, LinkTabs } from "@/components/admin/shared";
import { requireRole } from "@/lib/auth/session";
import { listCompanies } from "@/services/admin";

export const metadata = { title: "Companies · Admin" };

const TABS = [
  { value: "", label: "Awaiting check" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
  { value: "all", label: "All" },
];

async function Content({ searchParams }) {
  await requireRole(["admin"], { next: "/admin/companies" });
  const params = await searchParams;
  const status = TABS.some((t) => t.value === params.status) ? params.status : "";
  const q = String(params.q ?? "").trim();
  const items = await listCompanies({ filter: status || "awaiting", q });
  return (
    <div className="space-y-5">
      <AdminHeader icon={Building2} title="Companies" sub="Verified companies' listings go live straight away; others are reviewed first." />
      <div className="flex flex-wrap items-center gap-3">
        <LinkTabs tabs={TABS} active={status} ariaLabel="Verification status" />
        <div className="min-w-64 flex-1"><FilterBar values={{ q }} placeholder="Search companies" /></div>
      </div>
      <CompaniesList items={items} />
    </div>
  );
}

export default function AdminCompaniesPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
