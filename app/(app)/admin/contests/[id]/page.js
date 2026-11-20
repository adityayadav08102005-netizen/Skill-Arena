import { ArrowLeft, ExternalLink, Swords } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ContestForm from "@/components/admin/ContestForm";
import { requireRole } from "@/lib/auth/session";
import { AdminError } from "@/services/admin";
import { contestProblemOptions, getContestAdmin } from "@/services/adminContent";

export const metadata = { title: "Edit contest · Admin", robots: { index: false } };

async function Content({ params }) {
  const { id } = await params;
  await requireRole(["admin"], { next: `/admin/contests/${id}` });
  let contest;
  try {
    contest = await getContestAdmin(id);
  } catch (error) {
    if (error instanceof AdminError && error.status === 404) notFound();
    throw error;
  }
  const problemOptions = await contestProblemOptions();
  return (
    <div className="space-y-5">
      <Link href="/admin/contests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Contests</Link>
      <AdminHeader icon={Swords} title={contest.title} sub={`${contest.participants} registered`}>
        {contest.isPublished && (
          <Link href={`/contests/${contest.slug}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-4 py-2 text-sm hover:border-arena-300">
            Contest page <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
      </AdminHeader>
      <ContestForm contest={contest} problemOptions={problemOptions} />
    </div>
  );
}

export default function EditContestPage({ params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content params={params} />
    </Suspense>
  );
}
