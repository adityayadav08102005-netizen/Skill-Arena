import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import ListingForm from "@/components/recruiter/ListingForm";
import { MissingCompany, withRecruiter } from "@/components/recruiter/RecruiterGate";
import { requireRole } from "@/lib/auth/session";
import { Skill } from "@/lib/db/models";
import { RecruiterError, getOwnListing } from "@/services/recruiter";

export const metadata = { title: "Edit listing" };

async function load(user, id) {
  try {
    return await withRecruiter(() => getOwnListing(user, id));
  } catch (error) {
    if (error instanceof RecruiterError && error.status === 404) return { notFound: true };
    throw error;
  }
}

async function EditListing({ params }) {
  const { id } = await params;
  const { user } = await requireRole(["recruiter"], { next: `/recruiter/listings/${id}/edit` });
  const result = await load(user, id);
  if (result.notFound) notFound();
  if (result.missingCompany) return <MissingCompany />;
  const skills = await Skill.find({}, { name: 1 }).sort({ name: 1 }).lean();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/recruiter/listings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Your listings</Link>
      <Reveal><h1 className="text-2xl font-medium tracking-tight">Edit {result.data.title}</h1></Reveal>
      <ListingForm listing={result.data} skillOptions={skills.map((s) => s.name)} companyVerified={result.data.companyVerified} />
    </div>
  );
}

export default function EditListingPage({ params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <EditListing params={params} />
    </Suspense>
  );
}
