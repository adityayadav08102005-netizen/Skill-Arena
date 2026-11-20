import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Workspace from "@/components/algoarena/Workspace";
import { getCurrentUser } from "@/lib/auth/session";
import { executionMode } from "@/lib/execution/engine";
import { getChallengeFor } from "@/services/daily";
import { getProblemForWorkspace } from "@/services/problems";

export const metadata = { title: "Solve" };

async function Loader({ params }) {
  await connection();
  const { slug } = await params;
  const problem = await getProblemForWorkspace(slug);
  if (!problem) notFound();
  const [current, daily] = await Promise.all([getCurrentUser(), getChallengeFor()]);
  return (
    <Workspace
      problem={problem}
      isDaily={daily?.problem.slug === slug}
      execution={executionMode()}
      viewer={{ signedIn: Boolean(current), role: current?.user.role ?? null }}
    />
  );
}

export default function SolvePage({ params }) {
  return (
    <Suspense fallback={<div className="wide-page h-[70vh] animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Loader params={params} />
    </Suspense>
  );
}
