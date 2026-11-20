"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/app/Avatar";
import { cn } from "@/lib/utils/cn";

const MEDAL = { 1: "text-xp-600", 2: "text-muted", 3: "text-[#B5651D]" };

/**
 * Contest standings. While the contest is live they refresh every 15 seconds
 * and rows slide to their new positions; after it ends they are final.
 */
export default function Standings({ slug, initial, live }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contests/${slug}/standings`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError("");
    } catch {
      setError("Couldn't refresh the standings.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(refresh, 15_000);
    return () => clearInterval(timer);
  }, [live, refresh]);

  const meInTop = data.me && data.rows.some((r) => r.userId === data.me.userId);

  return (
    <section className="rounded-card border border-line bg-panel p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium">
          <Trophy size={16} className="text-xp-600" aria-hidden="true" /> {live ? "Live rankings" : "Final standings"}
        </h2>
        <span className="flex items-center gap-2 text-xs text-muted">
          {data.rows.length} ranked
          {live && (
            <button type="button" onClick={refresh} aria-label="Refresh standings" className="rounded-full p-1 transition-colors hover:bg-page">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
          )}
        </span>
      </header>
      {error && <p role="alert" className="mb-2 text-xs text-danger-600">{error}</p>}
      {data.rows.length === 0 ? (
        <p className="rounded-xl bg-page px-4 py-6 text-center text-sm text-muted">No one has scored yet.</p>
      ) : (
        <ol className="space-y-1">
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_3rem_3.5rem] gap-2 px-2 text-[11px] text-muted" aria-hidden="true">
            <span>#</span><span>Student</span><span className="text-right">Score</span><span className="text-right">Solved</span><span className="text-right">Penalty</span>
          </div>
          <AnimatePresence initial={false}>
            {data.rows.map((r) => (
              <motion.li
                key={r.userId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className={cn(
                  "grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_3rem_3.5rem] items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  r.isYou ? "bg-arena-50 text-arena-800" : "hover:bg-page",
                )}
              >
                <span className={cn("font-medium tabular-nums", MEDAL[r.rank])}>{r.rank}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar userId={r.userId} name={r.name} hasAvatar={r.hasAvatar} image={r.image} size="sm" className="size-6 text-[10px]" />
                  {r.profileHref ? <Link href={r.profileHref} className="truncate hover:underline">{r.name}</Link> : <span className="truncate">{r.name}</span>}
                  {r.isYou && <span className="text-[11px]">(you)</span>}
                </span>
                <span className="text-right font-medium tabular-nums">{r.score}</span>
                <span className="text-right tabular-nums text-muted">{r.solvedCount}</span>
                <span className="text-right tabular-nums text-muted">{r.penaltyMinutes}m</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      {data.me && !meInTop && (
        <p className="mt-2 rounded-lg bg-arena-50 px-3 py-2 text-sm text-arena-800">
          You: #{data.me.rank} · {data.me.score} points · {data.me.solvedCount} solved
        </p>
      )}
    </section>
  );
}
