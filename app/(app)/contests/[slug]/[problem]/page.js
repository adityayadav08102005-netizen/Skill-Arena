import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Workspace from "@/components/algoarena/Workspace";
import { getCurrentUser } from "@/lib/auth/session";
import { executionMode } from "@/lib/execution/engine";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { ContestError, getContest, getContestProblemRef } from "@/services/contests";
import { getProblemForWorkspace } from "@/services/problems";

export const metadata = { title: "Contest problem" };

async function Loader({ params }) {
  await connection();
  if (!isDatabaseConfigured()) notFound();
  const { slug, problem: problemSlug } = await params;
  let ref;
  try {
    ref = await getContestProblemRef(slug, problemSlug);
  } catch (error) {
    if (error instanceof ContestError && error.status === 403) redirect(`/contests/${slug}`); // not started yet
    if (error instanceof ContestError) notFound();
    throw error;
  }
  const current = await getCurrentUser();
  const student = current?.user.role === "student" ? current.user : null;
  const [problem, contest] = await Promise.all([getProblemForWorkspace(problemSlug, { allowUnpublished: true }), getContest(slug, student)]);
  if (!problem) notFound();
  return (
    <Workspace
      problem={problem}
      isDaily={false}
      execution={executionMode()}
      viewer={{ signedIn: Boolean(current), role: current?.user.role ?? null }}
      contest={{ slug, title: contest.title, state: ref.state, endsAt: contest.endsAt, registered: contest.registered, points: ref.points }}
    />
  );
}

export default function ContestProblemPage({ params }) {
  return (
    <Suspense fallback={<div className="wide-page h-[70vh] animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Loader params={params} />
    </Suspense>
  );
}
