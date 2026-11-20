"use client";

import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Building2, ExternalLink, Flag } from "lucide-react";
import Link from "next/link";
import { ActionButton, ErrorLine, NoteAction, Pill, useAdminAction } from "./shared";
import TimeAgo from "@/components/common/TimeAgo";

const KIND = {
  listing: { label: "Listing", icon: Briefcase, tone: "xp", href: "/admin/opportunities" },
  company: { label: "Company", icon: Building2, tone: "bridge", href: "/admin/companies" },
  report: { label: "Report", icon: Flag, tone: "danger", href: "/admin/reports" },
};

/** Oldest-first items waiting for an admin, with the main decision inline. */
export default function ReviewQueue({ items }) {
  const { run, busy, error } = useAdminAction();
  if (!items.length) return <p className="rounded-xl bg-page px-4 py-6 text-center text-sm text-muted">Nothing is waiting for review.</p>;

  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const kind = KIND[item.kind];
            const key = `${item.kind}:${item.id}`;
            return (
              <motion.li key={key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 transition-[padding,background-color] duration-200 hover:bg-page hover:pl-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Pill tone={kind.tone}><kind.icon size={11} aria-hidden="true" /> {kind.label}</Pill>
                    <span className="truncate font-medium">{item.title}</span>
                    {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label="Open the reported item" className="text-muted hover:text-ink"><ExternalLink size={13} /></a>}
                  </div>
                  <p className="text-xs text-muted">{item.sub} · <TimeAgo date={item.at} /></p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {item.kind === "listing" && (
                    <>
                      <ActionButton busy={busy === `${key}:approve`} onClick={() => run(`/api/admin/listings/${item.id}`, { action: "approve" }, { key: `${key}:approve` })}>Approve</ActionButton>
                      <NoteAction label="Send back" required placeholder="What should the recruiter change?" busy={busy === `${key}:reject`} onConfirm={(note) => run(`/api/admin/listings/${item.id}`, { action: "reject", note }, { key: `${key}:reject` })} />
                    </>
                  )}
                  {item.kind === "company" && (
                    <>
                      <ActionButton busy={busy === `${key}:verify`} onClick={() => run(`/api/admin/companies/${item.id}`, { action: "verify" }, { key: `${key}:verify` })}>Verify</ActionButton>
                      <NoteAction label="Decline" placeholder="Optional note to the recruiter" busy={busy === `${key}:reject`} onConfirm={(note) => run(`/api/admin/companies/${item.id}`, { action: "reject", note }, { key: `${key}:reject` })} />
                    </>
                  )}
                  {item.kind === "report" && (
                    <>
                      <ActionButton tone="outline" busy={busy === `${key}:dismiss`} onClick={() => run(`/api/admin/reports/${item.id}`, { action: "dismiss" }, { key: `${key}:dismiss` })}>Dismiss</ActionButton>
                      <NoteAction label="Take down" placeholder="Optional note (sent to the owner)" busy={busy === `${key}:action`} onConfirm={(note) => run(`/api/admin/reports/${item.id}`, { action: "action", note }, { key: `${key}:action` })} />
                    </>
                  )}
                  <Link href={kind.href} className="px-2 text-xs text-muted hover:text-ink">Details</Link>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
