"use client";

import { AnimatePresence, motion } from "motion/react";
import { Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/app/Avatar";
import SlidingTabs from "@/components/common/SlidingTabs";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { value: "xp", label: "XP" },
  { value: "solved", label: "Solved" },
  { value: "contests", label: "Contests" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
];

const PODIUM = [
  { place: 2, height: 96, tone: "bg-page border-line", text: "text-muted" },
  { place: 1, height: 132, tone: "bg-xp-50 border-xp-200", text: "text-xp-800" },
  { place: 3, height: 72, tone: "bg-page border-line", text: "text-[#9A5B21]" },
];

const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");

function Name({ row }) {
  return row.profileHref ? <Link href={row.profileHref} className="truncate hover:underline">{row.name}</Link> : <span className="truncate">{row.name}</span>;
}

function detail(board, r) {
  if (board === "xp") return `Level ${r.level ?? 1}`;
  if (board === "contests") return `${r.contests} contest${r.contests === 1 ? "" : "s"}${r.bestRank ? ` · best #${r.bestRank}` : ""}`;
  return null;
}

export default function LeaderboardView({ boards }) {
  const [tab, setTab] = useState("xp");
  const board = boards[tab];
  // Podium = the first three positions (ties keep their shared rank number).
  const podium = PODIUM.map((p) => ({ ...p, row: board.rows[p.place - 1] ?? null }));
  const rest = board.rows.slice(3);
  const meVisible = board.me && board.rows.some((r) => r.userId === board.me.userId);

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto pb-1">
        <SlidingTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Leaderboards" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-4">
          {board.rows.length === 0 ? (
            <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
              Nobody is on this board yet. {tab === "weekly" ? "The week just started." : tab === "monthly" ? "The month just started." : ""}
            </p>
          ) : (
            <>
              <section aria-label="Top three" className="grid grid-cols-3 items-end gap-3 rounded-card border border-line bg-panel px-4 pb-0 pt-6">
                {podium.map(({ place, height, tone, text, row }) => (
                  <div key={place} className="flex flex-col items-center gap-2 text-center">
                    {row ? (
                      <>
                        {place === 1 && <Crown size={20} className="text-xp-600" aria-hidden="true" />}
                        <Avatar userId={row.userId} name={row.name} hasAvatar={row.hasAvatar} image={row.image} size={place === 1 ? "md" : "sm"} />
                        <span className="flex max-w-full text-sm font-medium"><Name row={row} /></span>
                      </>
                    ) : (
                      <span className="text-sm text-muted">—</span>
                    )}
                    <motion.div
                      className={cn("flex w-full flex-col items-center justify-start rounded-t-2xl border border-b-0 pt-3", tone)}
                      initial={{ height: 0 }}
                      animate={{ height }}
                      transition={{ duration: 0.8, delay: place * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      <span className={cn("text-2xl font-medium", text)}>{row?.rank ?? place}</span>
                      {row && <span className="text-xs text-muted">{fmt(row.value)} {board.unit}</span>}
                    </motion.div>
                  </div>
                ))}
              </section>

              {rest.length > 0 && (
                <ol className="overflow-hidden rounded-card border border-line bg-panel">
                  {rest.map((r, i) => (
                    <motion.li
                      key={`${tab}-${r.userId}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.025, 0.4) }}
                      className={cn(
                        "grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-2.5 text-sm transition-[background-color,padding] duration-200 last:border-0 hover:pl-6",
                        r.isYou ? "bg-arena-50 text-arena-800" : "hover:bg-page",
                      )}
                    >
                      <span className="font-medium tabular-nums text-muted">{r.rank}</span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar userId={r.userId} name={r.name} hasAvatar={r.hasAvatar} image={r.image} size="sm" />
                        <span className="min-w-0">
                          <span className="flex"><Name row={r} />{r.isYou && <span className="ml-1 text-xs">(you)</span>}</span>
                          {detail(tab, r) && <span className="block text-xs text-muted">{detail(tab, r)}</span>}
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">{fmt(r.value)} <span className="text-xs font-normal text-muted">{board.unit}</span></span>
                    </motion.li>
                  ))}
                </ol>
              )}
            </>
          )}

          {board.me && !meVisible && (
            <p className="sticky bottom-24 rounded-full border border-arena-200 bg-arena-50 px-4 py-2 text-center text-sm text-arena-800 shadow-float">
              You&apos;re #{board.me.rank} of {board.total} with {fmt(board.me.value)} {board.unit}
            </p>
          )}
          {!board.me && board.rows.length > 0 && <p className="text-center text-xs text-muted">{board.total} students ranked</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
