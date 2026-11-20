"use client";

import { motion } from "motion/react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { ErrorLine, Pill, useAdminAction } from "./shared";

const STATE = { upcoming: ["Upcoming", "arena"], live: ["Live", "bridge"], ended: ["Ended", "muted"] };
const fmt = (d) => new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function ContestsTable({ items }) {
  const { run, error } = useAdminAction();
  const [confirm, setConfirm] = useState(null);
  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <ul className="space-y-2">
        {items.map((c, i) => {
          const [label, tone] = STATE[c.state];
          return (
            <motion.li key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-panel p-4 transition-[padding,border-color] duration-200 hover:border-arena-300 hover:pl-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/admin/contests/${c.id}`} className="font-medium hover:text-arena-800">{c.title}</Link>
                  <Pill tone={tone}>{label}</Pill>
                  {!c.isPublished && <Pill>Unpublished</Pill>}
                  {c.finalized && <Pill tone="xp">Results final</Pill>}
                </div>
                <p className="text-xs text-muted">{fmt(c.startsAt)} → {fmt(c.endsAt)} · {c.problems} problem{c.problems === 1 ? "" : "s"} · {c.participants} registered</p>
              </div>
              <div className="flex items-center gap-1">
                {c.isPublished && <Link href={`/contests/${c.slug}`} aria-label={`Open ${c.title}`} className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><Eye size={15} /></Link>}
                <Link href={`/admin/contests/${c.id}`} aria-label={`Edit ${c.title}`} className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><Pencil size={15} /></Link>
                {c.state === "upcoming" && c.participants === 0 &&
                  (confirm === c.id ? (
                    <span className="inline-flex items-center gap-1">
                      <button type="button" onClick={async () => { await run(`/api/admin/contests/${c.id}`, null, { method: "DELETE", key: c.id }); setConfirm(null); }} className="rounded-full bg-danger-600 px-3 py-1.5 text-sm text-white">Delete for good</button>
                      <button type="button" onClick={() => setConfirm(null)} className="px-2 text-sm text-muted">Cancel</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirm(c.id)} aria-label={`Delete ${c.title}`} className="rounded-full p-2 text-muted hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>
                  ))}
              </div>
            </motion.li>
          );
        })}
      </ul>
      {!items.length && <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No contests yet.</p>}
    </div>
  );
}
