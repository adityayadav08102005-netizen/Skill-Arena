import { Code2 } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ArenaTabs from "@/components/algoarena/ArenaTabs";
import DailyChallengeCard from "@/components/algoarena/DailyChallengeCard";
import ProblemTable from "@/components/algoarena/ProblemTable";
import DemoBadge from "@/components/common/DemoBadge";
import ProgressRing from "@/components/common/ProgressRing";
import Reveal from "@/components/common/Reveal";
import { getCurrentUser } from "@/lib/auth/session";
import { nextDayStart } from "@/lib/utils/time";
import { getTodayForViewer } from "@/services/daily";
import { listLibrary } from "@/services/problems";

export const metadata = { title: "AlgoArena" };

async function Library() {
  await connection();
  const current = await getCurrentUser();
  const viewerId = current?.user.role === "student" ? current.user.id : null;
  const [library, daily] = await Promise.all([listLibrary(viewerId), getTodayForViewer(viewerId)]);

  const solved = library.problems.filter((p) => p.status === "solved");
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const p of solved) counts[p.difficulty] += 1;
  const totals = { easy: 0, medium: 0, hard: 0 };
  for (const p of library.problems) totals[p.difficulty] += 1;
  const percent = library.problems.length ? Math.round((solved.length / library.problems.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <Reveal>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
              <Code2 size={22} className="text-arena-600" aria-hidden="true" /> AlgoArena
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Practice problems by topic and difficulty in Python, Java, C++ or JavaScript.
              {library.mode === "demo" && <DemoBadge className="ml-2 align-middle" />}
            </p>
          </div>
          {viewerId ? (
            <div className="flex items-center gap-3 rounded-card border border-line bg-panel px-4 py-3">
              <ProgressRing percent={percent} size={56} label={`${solved.length} of ${library.problems.length} solved`}>
                {solved.length}
              </ProgressRing>
              <dl className="grid grid-cols-3 gap-4 text-center text-xs">
                {["easy", "medium", "hard"].map((d) => (
                  <div key={d}>
                    <dt className="capitalize text-muted">{d}</dt>
                    <dd className="text-sm font-medium">
                      {counts[d]}<span className="text-muted">/{totals[d]}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted">
              <Link href="/login?next=%2Falgoarena" className="text-arena-600 hover:underline">Log in</Link> as a student to track your progress.
            </p>
          )}
        </header>
      </Reveal>

      <ArenaTabs />
      <DailyChallengeCard daily={daily} resetAt={nextDayStart()} streak={current?.profile?.streak} signedIn={Boolean(viewerId)} />
      <ProblemTable problems={library.problems} signedIn={Boolean(viewerId)} />
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-16 w-80 animate-pulse rounded-xl bg-panel" />
      <div className="h-40 animate-pulse rounded-card bg-panel" />
      <div className="h-96 animate-pulse rounded-card bg-panel" />
    </div>
  );
}

export default function AlgoArenaPage() {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <Library />
    </Suspense>
  );
}
