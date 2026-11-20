import { ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ContestForm from "@/components/admin/ContestForm";
import { requireRole } from "@/lib/auth/session";
import { contestProblemOptions } from "@/services/adminContent";

export const metadata = { title: "New contest · Admin" };

async function Content() {
  await requireRole(["admin"], { next: "/admin/contests/new" });
  const problemOptions = await contestProblemOptions();
  return (
    <div className="space-y-5">
      <Link href="/admin/contests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Contests</Link>
      <AdminHeader icon={Swords} title="New contest" />
      <ContestForm problemOptions={problemOptions} />
    </div>
  );
}

export default function NewContestPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content />
    </Suspense>
  );
}
