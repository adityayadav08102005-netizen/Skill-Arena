import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import ListingForm from "@/components/recruiter/ListingForm";
import { MissingCompany, withRecruiter } from "@/components/recruiter/RecruiterGate";
import { requireRole } from "@/lib/auth/session";
import { Skill } from "@/lib/db/models";
import { getCompany } from "@/services/recruiter";

export const metadata = { title: "New listing" };

async function NewListing() {
  const { user } = await requireRole(["recruiter"], { next: "/recruiter/listings/new" });
  const { data: company, missingCompany } = await withRecruiter(() => getCompany(user));
  if (missingCompany) return <MissingCompany />;
  const skills = await Skill.find({}, { name: 1 }).sort({ name: 1 }).lean();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/recruiter/listings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Your listings</Link>
      <Reveal><h1 className="text-2xl font-medium tracking-tight">New listing at {company.name}</h1></Reveal>
      <ListingForm listing={null} skillOptions={skills.map((s) => s.name)} companyVerified={company.isVerified} />
    </div>
  );
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <NewListing />
    </Suspense>
  );
}
