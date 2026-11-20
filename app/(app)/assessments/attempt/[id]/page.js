import { notFound } from "next/navigation";
import { Suspense } from "react";
import QuizRunner from "@/components/assessments/QuizRunner";
import ResultsView from "@/components/assessments/ResultsView";
import { requireRole } from "@/lib/auth/session";
import { AssessmentError, getAttemptForTaking, getAttemptReview } from "@/services/assessments";

export const metadata = { title: "Assessment" };

/** Loads the open attempt, or its review once submitted. Returns null if it isn't the viewer's. */
async function load(user, id) {
  try {
    const taking = await getAttemptForTaking(user, id);
    if (!taking.finished) return { taking };
    return { review: await getAttemptReview(user, id) };
  } catch (error) {
    if (error instanceof AssessmentError && error.status === 404) return null;
    throw error;
  }
}

/** The quiz while the attempt is open; the results and review once it's submitted. */
async function Attempt({ params }) {
  const { id } = await params;
  const { user } = await requireRole(["student"], { next: `/assessments/attempt/${id}` });
  const data = await load(user, id);
  if (!data || (!data.taking && !data.review)) notFound();
  if (data.taking) return <QuizRunner key={data.taking.attemptId} attempt={data.taking} />;
  return <ResultsView review={data.review} />;
}

export default function AttemptPage({ params }) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Attempt params={params} />
    </Suspense>
  );
}
