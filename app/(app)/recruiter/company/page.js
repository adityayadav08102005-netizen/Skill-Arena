import { BadgeCheck, Building2 } from "lucide-react";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import CompanyForm from "@/components/recruiter/CompanyForm";
import { MissingCompany, withRecruiter } from "@/components/recruiter/RecruiterGate";
import { requireRole } from "@/lib/auth/session";
import { getCompany } from "@/services/recruiter";

export const metadata = { title: "Company profile" };

async function Company() {
  const { user } = await requireRole(["recruiter"], { next: "/recruiter/company" });
  const { data, missingCompany } = await withRecruiter(() => getCompany(user));
  if (missingCompany) return <MissingCompany />;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Reveal>
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
            <Building2 size={22} className="text-bridge-600" aria-hidden="true" /> Company profile
          </h1>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted">
            {data.isVerified ? <><BadgeCheck size={14} className="text-bridge-600" aria-hidden="true" /> Verified by SkillArena</> : "Not verified yet. An admin verifies companies; until then listings are reviewed before going live."}
          </p>
        </header>
      </Reveal>
      <CompanyForm company={data} />
    </div>
  );
}

export default function CompanyPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Company />
    </Suspense>
  );
}
