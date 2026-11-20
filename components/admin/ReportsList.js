"use client";

import { motion } from "motion/react";
import { ExternalLink, Flag } from "lucide-react";
import { ActionButton, ErrorLine, NoteAction, Pill, useAdminAction } from "./shared";
import TimeAgo from "@/components/common/TimeAgo";

const TAKE_DOWN = {
  opportunity: "Send the listing back to the recruiter",
  profile: "Make the profile private",
  problem: "Unpublish the problem",
  question: "Deactivate the question",
};

/** Reports from users. Taking an item down closes every open report about it. */
export default function ReportsList({ items }) {
  const { run, busy, error } = useAdminAction();
  const decide = (id, action, note) => run(`/api/admin/reports/${id}`, { action, note }, { key: `${id}:${action}` });
  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <ul className="space-y-2">
        {items.map((r, i) => (
          <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="rounded-card border border-line bg-panel p-4 transition-colors hover:border-danger-50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="danger"><Flag size={11} aria-hidden="true" /> {r.reasonLabel}</Pill>
                  <Pill>{r.entity.typeLabel}</Pill>
                  {r.status !== "open" && <Pill tone={r.status === "actioned" ? "bridge" : "muted"}>{r.status === "actioned" ? "Taken down" : "Dismissed"}</Pill>}
                  {r.status === "open" && r.entity.state && <Pill tone={r.entity.live ? "xp" : "muted"}>Currently {r.entity.state.replace("_", " ")}</Pill>}
                </div>
                <p className="mt-1 font-medium">
                  {r.entity.link ? (
                    <a href={r.entity.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-arena-800">{r.entity.title} <ExternalLink size={13} aria-hidden="true" /></a>
                  ) : (
                    r.entity.title
                  )}
                </p>
                {r.details && <p className="mt-1 whitespace-pre-line text-sm text-muted">&ldquo;{r.details}&rdquo;</p>}
                <p className="mt-1 text-xs text-muted">Reported by {r.reporter} · <TimeAgo date={r.createdAt} />{r.resolvedAt && <> · resolved <TimeAgo date={r.resolvedAt} /></>}</p>
              </div>
              {r.status === "open" && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <ActionButton tone="outline" busy={busy === `${r.id}:dismiss`} onClick={() => decide(r.id, "dismiss")}>Dismiss</ActionButton>
                  <NoteAction label="Take down" confirmLabel={TAKE_DOWN[r.entityType]} placeholder="Optional note (sent to the owner where there is one)" busy={busy === `${r.id}:action`} onConfirm={(note) => decide(r.id, "action", note)} />
                </div>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
      {!items.length && <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No reports here.</p>}
    </div>
  );
}
