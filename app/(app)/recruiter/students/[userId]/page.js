import { ArrowLeft } from "lucide-react";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import { ApplicationStatus } from "@/components/dashboard/StatusPill";
import ExternalStats from "@/components/profile/ExternalStats";
import CandidateDetails from "@/components/recruiter/CandidateDetails";
import { requireRole } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Application, Company, Opportunity, Profile } from "@/lib/db/models";
import { candidateSummary } from "@/services/candidates";
import { getExternalStats } from "@/services/externalProfiles";

export const metadata = { title: "Candidate" };

/**
 * Candidate profile for recruiters. Students who applied to one of your
 * listings share their full profile with you; anyone else must have a public
 * profile, and their private sections stay hidden.
 */
async function Candidate({ params }) {
  const { userId } = await params;
  const { user } = await requireRole(["recruiter", "admin"], { next: `/recruiter/students/${userId}` });
  if (!ObjectId.isValid(userId)) notFound();
  await connectToDatabase();

  const company = user.role === "recruiter" ? await Company.findOne({ ownerId: new ObjectId(user.id) }, { _id: 1 }).lean() : null;
  const listingIds = company ? (await Opportunity.find({ $or: [{ companyId: company._id }, { postedBy: new ObjectId(user.id) }] }, { _id: 1, title: 1 }).lean()) : [];
  const titleOf = new Map(listingIds.map((l) => [String(l._id), l.title]));
  const applications = listingIds.length
    ? await Application.find({ studentId: new ObjectId(userId), opportunityId: { $in: listingIds.map((l) => l._id) } }, { status: 1, opportunityId: 1, appliedAt: 1 }).lean()
    : [];
  const applied = applications.length > 0 || user.role === "admin";

  const profile = await Profile.findOne({ userId: new ObjectId(userId), onboardingComplete: true }, { isPublic: 1, isActive: 1 }).lean();
  if (!profile || (!applied && (profile.isPublic === false || profile.isActive === false))) notFound();
  const c = await candidateSummary(userId, { forRecruiter: applied });
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/recruiter/students" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> Find students</Link>
      {applications.length > 0 && (
        <Reveal>
          <section className="rounded-card border border-bridge-200 bg-bridge-50/50 p-4">
            <h2 className="mb-2 text-sm font-medium">Applied to your listings</h2>
            <ul className="space-y-1">
              {applications.map((a) => (
                <li key={String(a._id)}>
                  <Link href={`/recruiter/listings/${a.opportunityId}?candidate=${a._id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel">
                    <span className="truncate">{titleOf.get(String(a.opportunityId))}</span>
                    <ApplicationStatus status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <section className="rounded-card border border-line bg-panel p-5">
          <CandidateDetails c={c} />
        </section>
      </Reveal>
      {(c.githubUsername || (c.codeforcesHandle && c.codingVisible)) && (
        <Suspense fallback={<div className="h-48 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
          <External userId={userId} c={c} />
        </Suspense>
      )}
    </div>
  );
}

/** GitHub and Codeforces stats, respecting the student's privacy choices. */
async function External({ userId, c }) {
  const stats = await getExternalStats(userId, { githubUsername: c.githubUsername, codeforcesHandle: c.codingVisible ? c.codeforcesHandle : null });
  return <ExternalStats stats={stats} />;
}

export default function CandidatePage({ params }) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-4xl animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Candidate params={params} />
    </Suspense>
  );
}
