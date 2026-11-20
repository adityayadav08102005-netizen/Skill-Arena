import { ArrowLeft, Code2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ProblemForm from "@/components/admin/ProblemForm";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "New problem · Admin" };

async function Content() {
  await requireRole(["admin"], { next: "/admin/problems/new" });
  return (
    <div className="space-y-5">
      <Link href="/admin/problems" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Problems</Link>
      <AdminHeader icon={Code2} title="New problem" sub="Solutions read stdin and print to stdout. Start as a draft and publish once the tests are right." />
      <ProblemForm />
    </div>
  );
}

export default function NewProblemPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content />
    </Suspense>
  );
}
