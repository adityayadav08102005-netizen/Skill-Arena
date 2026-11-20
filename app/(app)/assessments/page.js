import { ClipboardCheck } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import AssessmentCard from "@/components/assessments/AssessmentCard";
import PerformancePanel from "@/components/assessments/PerformancePanel";
import DemoBadge from "@/components/common/DemoBadge";
import Reveal from "@/components/common/Reveal";
import { getCurrentUser } from "@/lib/auth/session";
import { getPerformance, listAssessments } from "@/services/assessments";

export const metadata = { title: "Assessments" };

async function Center() {
  await connection();
  const current = await getCurrentUser();
  const student = current?.user.role === "student" ? current.user : null;
  const [list, performance] = await Promise.all([listAssessments(student?.id), student ? getPerformance(student.id) : null]);
  const viewer = { signedIn: Boolean(current), role: current?.user.role ?? null };

  return (
    <div className="space-y-6">
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
              <ClipboardCheck size={22} className="text-bridge-600" aria-hidden="true" /> Assessments
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Timed multiple-choice tests with full answer review. Scoring 80% or more verifies the skill on your profile.
              {list.mode === "demo" && <DemoBadge className="ml-2 align-middle" />}
            </p>
          </div>
          {performance?.taken > 0 && (
            <dl className="flex gap-2 text-center text-xs">
              {[["Taken", performance.taken], ["Passed", performance.passed], ["Average", `${performance.average}%`]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-panel px-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-lg font-medium">{v}</dd></div>
              ))}
            </dl>
          )}
        </header>
      </Reveal>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.items.map((item, i) => <AssessmentCard key={item.slug} item={item} index={i} viewer={viewer} demo={list.mode === "demo"} />)}
      </section>

      {performance?.taken > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium tracking-tight">Your performance</h2>
          <PerformancePanel data={performance} />
        </section>
      )}
    </div>
  );
}

export default function AssessmentsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Center />
    </Suspense>
  );
}
