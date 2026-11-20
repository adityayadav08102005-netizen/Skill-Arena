import { Code2, Plus } from "lucide-react";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ProblemsTable from "@/components/admin/ProblemsTable";
import { FilterBar } from "@/components/admin/shared";
import SlideButton from "@/components/common/SlideButton";
import { requireRole } from "@/lib/auth/session";
import { listProblemsAdmin } from "@/services/adminContent";

export const metadata = { title: "Problems · Admin" };

async function Content({ searchParams }) {
  await requireRole(["admin"], { next: "/admin/problems" });
  const params = await searchParams;
  const status = ["published", "draft"].includes(params.status) ? params.status : "";
  const q = String(params.q ?? "").trim();
  const items = await listProblemsAdmin({ q, status });
  return (
    <div className="space-y-5">
      <AdminHeader icon={Code2} title="Problems" sub="Drafts stay hidden from students (contest problems are revealed when the contest starts).">
        <SlideButton href="/admin/problems/new"><Plus size={15} aria-hidden="true" /> New problem</SlideButton>
      </AdminHeader>
      <FilterBar values={{ q, status }} placeholder="Search title or slug" fields={[{ name: "status", label: "Status", options: [["", "All"], ["published", "Published"], ["draft", "Drafts"]] }]} />
      <ProblemsTable items={items} />
    </div>
  );
}

export default function AdminProblemsPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
