import { ArrowLeft, Code2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ProblemForm from "@/components/admin/ProblemForm";
import { requireRole } from "@/lib/auth/session";
import { AdminError } from "@/services/admin";
import { getProblemAdmin } from "@/services/adminContent";

export const metadata = { title: "Edit problem · Admin", robots: { index: false } };

async function Content({ params }) {
  const { id } = await params;
  await requireRole(["admin"], { next: `/admin/problems/${id}` });
  let problem;
  try {
    problem = await getProblemAdmin(id);
  } catch (error) {
    if (error instanceof AdminError && error.status === 404) notFound();
    throw error;
  }
  return (
    <div className="space-y-5">
      <Link href="/admin/problems" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Problems</Link>
      <AdminHeader icon={Code2} title={problem.title} sub={problem.isPublished ? "Published: changes apply to new submissions straight away." : "Draft: hidden from students."}>
        {problem.isPublished && (
          <Link href={`/algoarena/${problem.slug}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-4 py-2 text-sm hover:border-arena-300">
            Open in AlgoArena <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
      </AdminHeader>
      <ProblemForm problem={problem} />
    </div>
  );
}

export default function EditProblemPage({ params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content params={params} />
    </Suspense>
  );
}
