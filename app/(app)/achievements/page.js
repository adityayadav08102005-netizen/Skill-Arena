import { Award } from "lucide-react";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import ProgressView from "@/components/progress/ProgressView";
import { requireRole } from "@/lib/auth/session";
import { getProgress } from "@/services/progress";

export const metadata = { title: "Progress and achievements" };

async function Progress() {
  const { user, profile } = await requireRole(["student"], { next: "/achievements" });
  const data = await getProgress(user, profile);
  return (
    <div className="space-y-5">
      <Reveal>
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
            <Award size={22} className="text-xp-600" aria-hidden="true" /> Progress and achievements
          </h1>
          <p className="mt-0.5 text-sm text-muted">Goals, milestones and badges. Everything here is calculated from your activity on the server.</p>
        </header>
      </Reveal>
      <ProgressView data={data} />
    </div>
  );
}

export default function AchievementsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Progress />
    </Suspense>
  );
}
