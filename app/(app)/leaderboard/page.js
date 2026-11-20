import { Trophy } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import DemoBadge from "@/components/common/DemoBadge";
import Reveal from "@/components/common/Reveal";
import LeaderboardView from "@/components/leaderboard/LeaderboardView";
import { getCurrentUser } from "@/lib/auth/session";
import { getLeaderboards } from "@/services/leaderboard";

export const metadata = { title: "Leaderboard" };

async function Board() {
  await connection();
  const current = await getCurrentUser();
  const data = await getLeaderboards(current?.user.role === "student" ? current.user.id : null);
  return (
    <div className="space-y-5">
      <Reveal>
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
            <Trophy size={22} className="text-xp-600" aria-hidden="true" /> Leaderboard
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Global rankings for students. XP is awarded and checked on the server. Private profiles are ranked but shown anonymously.
            {data.mode === "demo" && <DemoBadge className="ml-2 align-middle" />}
          </p>
        </header>
      </Reveal>
      <LeaderboardView boards={data.boards} />
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Board />
    </Suspense>
  );
}
