import { Plus, Swords } from "lucide-react";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ContestsTable from "@/components/admin/ContestsTable";
import SlideButton from "@/components/common/SlideButton";
import { requireRole } from "@/lib/auth/session";
import { listContestsAdmin } from "@/services/adminContent";

export const metadata = { title: "Contests · Admin" };

async function Content() {
  await requireRole(["admin"], { next: "/admin/contests" });
  const items = await listContestsAdmin();
  return (
    <div className="space-y-5">
      <AdminHeader icon={Swords} title="Contests" sub="Schedule contests from the problem library. Results, XP and badges are applied automatically when a contest ends.">
        <SlideButton href="/admin/contests/new"><Plus size={15} aria-hidden="true" /> New contest</SlideButton>
      </AdminHeader>
      <ContestsTable items={items} />
    </div>
  );
}

export default function AdminContestsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content />
    </Suspense>
  );
}
