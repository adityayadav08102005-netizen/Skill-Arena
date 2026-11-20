import { Briefcase, Plus } from "lucide-react";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import SlideButton from "@/components/common/SlideButton";
import ListingsTable from "@/components/recruiter/ListingsTable";
import { MissingCompany, withRecruiter } from "@/components/recruiter/RecruiterGate";
import { requireRole } from "@/lib/auth/session";
import { listOwnListings } from "@/services/recruiter";

export const metadata = { title: "Your listings" };

async function Listings() {
  const { user } = await requireRole(["recruiter"], { next: "/recruiter/listings" });
  const { data, missingCompany } = await withRecruiter(() => listOwnListings(user));
  if (missingCompany) return <MissingCompany />;
  return (
    <div className="space-y-5">
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
              <Briefcase size={22} className="text-bridge-600" aria-hidden="true" /> Your listings
            </h1>
            <p className="mt-0.5 text-sm text-muted">Listings with applications can be closed but not deleted, so candidates keep their history.</p>
          </div>
          <SlideButton href="/recruiter/listings/new" variant="bridge"><Plus size={15} aria-hidden="true" /> New listing</SlideButton>
        </header>
      </Reveal>
      {data.listings.length ? (
        <ListingsTable listings={data.listings} />
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No listings yet. Post your first internship or job.</p>
      )}
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Listings />
    </Suspense>
  );
}
