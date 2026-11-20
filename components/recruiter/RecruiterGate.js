import { Building2 } from "lucide-react";
import Link from "next/link";
import { RecruiterError } from "@/services/recruiter";

/**
 * Runs a recruiter loader; if the recruiter has no company yet, shows how to
 * fix that instead of an error page.
 */
export async function withRecruiter(load) {
  try {
    return { data: await load() };
  } catch (error) {
    if (error instanceof RecruiterError && [403, 409].includes(error.status)) return { missingCompany: true };
    throw error;
  }
}

export function MissingCompany() {
  return (
    <div className="mx-auto max-w-md rounded-card border border-line bg-panel p-6 text-center">
      <Building2 size={24} className="mx-auto text-bridge-600" aria-hidden="true" />
      <h1 className="mt-3 text-lg font-medium">No company linked to your account</h1>
      <p className="mt-1 text-sm text-muted">Recruiter accounts manage one company. Contact an admin to link yours.</p>
      <Link href="/profile" className="mt-4 inline-block text-sm text-bridge-600 hover:underline">Go to your profile</Link>
    </div>
  );
}
