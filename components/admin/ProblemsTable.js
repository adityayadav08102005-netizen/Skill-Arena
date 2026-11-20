"use client";

import { motion } from "motion/react";
import { Eye, Flag, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ActionButton, ErrorLine, Pill, useAdminAction } from "./shared";

const DIFF = { easy: "bg-bridge-50 text-bridge-800", medium: "bg-xp-50 text-xp-800", hard: "bg-danger-50 text-danger-800" };

/** Problem library for admins: publish/unpublish, edit, delete when unused. */
export default function ProblemsTable({ items }) {
  const { run, busy, error } = useAdminAction();
  const [confirm, setConfirm] = useState(null);
  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <ul className="space-y-2">
        {items.map((p, i) => (
          <motion.li key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-panel p-3 transition-[padding,border-color] duration-200 hover:border-arena-300 hover:pl-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/admin/problems/${p.id}`} className="font-medium hover:text-arena-800">{p.title}</Link>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] capitalize", DIFF[p.difficulty])}>{p.difficulty}</span>
                {p.isPublished ? <Pill tone="bridge">Published</Pill> : <Pill>Draft</Pill>}
                {p.isInterview && <Pill tone="arena">Interview</Pill>}
                {p.openReports > 0 && <Pill tone="danger"><Flag size={11} aria-hidden="true" /> {p.openReports}</Pill>}
              </div>
              <p className="truncate text-xs text-muted">
                /{p.slug} · {p.topics.join(", ")} · {p.xpReward} XP · {p.submissions} submission{p.submissions === 1 ? "" : "s"}
                {p.acceptance !== null && ` · ${p.acceptance}% accepted`}
                {p.contests > 0 && ` · in ${p.contests} contest${p.contests === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <ActionButton tone="outline" busy={busy === `${p.id}:pub`} onClick={() => run(`/api/admin/problems/${p.id}`, { isPublished: !p.isPublished }, { key: `${p.id}:pub` })}>
                {p.isPublished ? "Unpublish" : "Publish"}
              </ActionButton>
              {p.isPublished && <Link href={`/algoarena/${p.slug}`} aria-label={`Open ${p.title} in AlgoArena`} className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><Eye size={15} /></Link>}
              <Link href={`/admin/problems/${p.id}`} aria-label={`Edit ${p.title}`} className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><Pencil size={15} /></Link>
              {p.submissions === 0 && p.contests === 0 &&
                (confirm === p.id ? (
                  <span className="inline-flex items-center gap-1">
                    <button type="button" onClick={async () => { await run(`/api/admin/problems/${p.id}`, null, { method: "DELETE", key: `${p.id}:del` }); setConfirm(null); }} className="rounded-full bg-danger-600 px-3 py-1.5 text-sm text-white">Delete for good</button>
                    <button type="button" onClick={() => setConfirm(null)} className="px-2 text-sm text-muted">Cancel</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirm(p.id)} aria-label={`Delete ${p.title}`} className="rounded-full p-2 text-muted hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>
                ))}
            </div>
          </motion.li>
        ))}
      </ul>
      {!items.length && <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No problems match.</p>}
    </div>
  );
}
