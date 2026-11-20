import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import ReportButton from "@/components/common/ReportButton";
import ExternalStats from "@/components/profile/ExternalStats";
import PublicProfile from "@/components/profile/PublicProfile";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { getExternalStats } from "@/services/externalProfiles";
import { getPublicProfile } from "@/services/profiles";

export const metadata = { title: "Profile" };

async function ProfileView({ params }) {
  // Profiles change and depend on the viewer: always render at request time.
  await connection();
  const { userId } = await params;
  if (!isDatabaseConfigured()) notFound();
  const viewer = (await getCurrentUser())?.user ?? null;
  const profile = await getPublicProfile(userId, viewer);
  if (!profile) notFound();

  // Resume download mirrors the rule in /api/files/resume: owner, admin, or a recruiter when shared.
  const canDownloadResume =
    profile.hasResume && Boolean(viewer) && (profile.isOwner || viewer.role === "admin" || viewer.role === "recruiter");
  const canReport = Boolean(viewer) && !profile.isOwner && viewer.role !== "admin" && profile.isPublic !== false;
  return (
    <>
      <PublicProfile profile={profile} canDownloadResume={canDownloadResume} />
      {profile.role === "student" && (profile.githubUsername || (profile.codeforcesHandle && profile.showCodingStats)) && (
        <Suspense fallback={<div className="mt-4 h-48 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
          <External userId={userId} profile={profile} owner={profile.isOwner} />
        </Suspense>
      )}
      {canReport && (
        <div className="mt-3 flex justify-end">
          <ReportButton entityType="profile" entityId={userId} what="profile" />
        </div>
      )}
    </>
  );
}

/** GitHub follows the profile's GitHub visibility; Codeforces follows "coding stats". */
async function External({ userId, profile, owner }) {
  const stats = await getExternalStats(userId, {
    githubUsername: profile.githubUsername,
    codeforcesHandle: profile.showCodingStats ? profile.codeforcesHandle : null,
  });
  return <ExternalStats stats={stats} owner={owner} className="mt-4" />;
}

export default function PublicProfilePage({ params }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <ProfileView params={params} />
    </Suspense>
  );
}
