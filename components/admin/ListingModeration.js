"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, ChevronDown, ExternalLink, Flag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LISTING_STATUS } from "@/components/recruiter/ListingsTable";
import { MODE_LABEL, TYPE_LABEL } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ActionButton, ErrorLine, NoteAction, Pill, useAdminAction } from "./shared";
import TimeAgo from "@/components/common/TimeAgo";

const TONE = { published: "bridge", pending_review: "xp", rejected: "danger", closed: "muted", draft: "muted" };

/** Listings to moderate: expand to read the full post, then approve, send back or take down. */
export default function ListingModeration({ items }) {
  const { run, busy, error } = useAdminAction();
  const [open, setOpen] = useState(null);
  const decide = (id, action, note) => run(`/api/admin/listings/${id}`, { action, note }, { key: `${id}:${action}` });

  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <ul className="space-y-2">
        {items.map((l, i) => {
          const expanded = open === l.id;
          return (
            <motion.li key={l.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="overflow-hidden rounded-card border border-line bg-panel transition-colors hover:border-xp-200">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button type="button" onClick={() => setOpen(expanded ? null : l.id)} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{l.title}</span>
                    <Pill tone={TONE[l.status]}>{LISTING_STATUS[l.status]?.[0] ?? l.status}</Pill>
                    {l.openReports > 0 && <Pill tone="danger"><Flag size={11} aria-hidden="true" /> {l.openReports} report{l.openReports === 1 ? "" : "s"}</Pill>}
                    {l.source !== "manual" && <Pill>{l.source}</Pill>}
                    {l.isSample && <Pill>Sample data</Pill>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    {l.companyName}
                    {l.companyVerified && <BadgeCheck size={12} className="text-bridge-600" aria-label="verified company" />}
                    {" "}· {TYPE_LABEL[l.type]} · {MODE_LABEL[l.workMode]} · {l.location} · {l.applicants} applicant{l.applicants === 1 ? "" : "s"} · updated <TimeAgo date={l.updatedAt} />
                    <ChevronDown size={14} className={cn("ml-1 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  {["pending_review", "rejected"].includes(l.status) && <ActionButton busy={busy === `${l.id}:approve`} onClick={() => decide(l.id, "approve")}>Approve</ActionButton>}
                  {l.status === "pending_review" && <NoteAction label="Send back" required placeholder="What should the recruiter change?" busy={busy === `${l.id}:reject`} onConfirm={(note) => decide(l.id, "reject", note)} />}
                  {["published", "closed"].includes(l.status) && <NoteAction label="Take down" required placeholder="Why is it coming down? (sent to the recruiter)" busy={busy === `${l.id}:take_down`} onConfirm={(note) => decide(l.id, "take_down", note)} />}
                  {l.status === "published" && <Link href={`/skillbridge/${l.id}`} aria-label="Open on SkillBridge" className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><ExternalLink size={15} /></Link>}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-2 border-t border-line p-4 text-sm">
                      {l.moderationNote && <p className="rounded-lg bg-danger-50 px-3 py-2 text-danger-800">Last admin note: {l.moderationNote}</p>}
                      <div className="flex flex-wrap gap-1">{l.requiredSkills.map((s) => <span key={s} className="rounded-md border border-line px-1.5 py-0.5 text-xs">{s}</span>)}</div>
                      {l.salary?.min != null && <p className="text-xs text-muted">Pay: ₹{l.salary.min.toLocaleString("en-IN")}{l.salary.max ? `–${l.salary.max.toLocaleString("en-IN")}` : ""} per {l.salary.period}</p>}
                      <p className="max-h-72 overflow-y-auto whitespace-pre-line text-muted">{l.description}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
      {!items.length && <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No listings here.</p>}
    </div>
  );
}
