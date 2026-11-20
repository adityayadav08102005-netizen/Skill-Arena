import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import { LISTING_STATUS } from "@/components/recruiter/ListingsTable";
import PipelineBoard from "@/components/recruiter/PipelineBoard";
import { MissingCompany, withRecruiter } from "@/components/recruiter/RecruiterGate";
import { requireRole } from "@/lib/auth/session";
import { MODE_LABEL } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { RecruiterError, getPipeline } from "@/services/recruiter";

export const metadata = { title: "Applicants" };

async function load(user, id) {
  try {
    return await withRecruiter(() => getPipeline(user, id));
  } catch (error) {
    if (error instanceof RecruiterError && error.status === 404) return { notFound: true };
    throw error;
  }
}

async function Pipeline({ params }) {
  const { id } = await params;
  const { user } = await requireRole(["recruiter"], { next: `/recruiter/listings/${id}` });
  const result = await load(user, id);
  if (result.notFound) notFound();
  if (result.missingCompany) return <MissingCompany />;
  const { listing, applications } = result.data;
  const [label, tone] = LISTING_STATUS[listing.status] ?? [listing.status, "bg-page text-muted"];

  return (
    <div className="wide-page space-y-4">
      <Link href="/recruiter/listings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Your listings</Link>
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-medium tracking-tight">{listing.title}</h1>
              <span className={cn("rounded-full px-2 py-0.5 text-xs", tone)}>{label}</span>
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {listing.location} · {MODE_LABEL[listing.workMode]} · {applications.filter((a) => a.status !== "withdrawn").length} active applicants · needs {listing.requiredSkills.join(", ")}
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link href={`/skillbridge/${listing.id}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3.5 py-1.5 hover:border-bridge-200">Student view <ExternalLink size={13} aria-hidden="true" /></Link>
            <Link href={`/recruiter/listings/${listing.id}/edit`} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3.5 py-1.5 hover:border-bridge-200"><Pencil size={13} aria-hidden="true" /> Edit</Link>
          </div>
        </header>
      </Reveal>
      {applications.length ? (
        <PipelineBoard applications={applications} />
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No applications yet.</p>
      )}
    </div>
  );
}

export default function PipelinePage({ params }) {
  return (
    <Suspense fallback={<div className="wide-page h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Pipeline params={params} />
    </Suspense>
  );
}
