"use client";

import { motion } from "motion/react";
import { BadgeCheck, ExternalLink, MapPin } from "lucide-react";
import { ActionButton, ErrorLine, NoteAction, Pill, useAdminAction } from "./shared";
import TimeAgo from "@/components/common/TimeAgo";

/** Companies with their owner, listings and the verification decision. */
export default function CompaniesList({ items }) {
  const { run, busy, error } = useAdminAction();
  const decide = (id, action, note) => run(`/api/admin/companies/${id}`, { action, note }, { key: `${id}:${action}` });
  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
        {items.map((c, i) => (
          <motion.li key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4 transition-[translate,border-color] duration-300 hover:-translate-y-0.5 hover:border-bridge-200">
            <div className="flex items-start gap-3">
              {c.hasLogo ? (
                // eslint-disable-next-line @next/next/no-img-element -- served from GridFS by our own route
                <img src={`/api/files/logo/${c.id}`} alt="" className="size-10 rounded-xl border border-line object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bridge-50 font-medium text-bridge-800" aria-hidden="true">{c.name[0]}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{c.name}</span>
                  {c.isVerified ? <Pill tone="bridge"><BadgeCheck size={11} aria-hidden="true" /> Verified</Pill> : c.reviewedAt ? <Pill tone="danger">Declined</Pill> : c.owner ? <Pill tone="xp">Awaiting check</Pill> : <Pill>Unverified</Pill>}
                  {c.isSample && <Pill>Sample data</Pill>}
                </div>
                <p className="text-xs text-muted">
                  {[c.industry, c.size && `${c.size} people`].filter(Boolean).join(" · ")}
                  {c.location && <span className="ml-1 inline-flex items-center gap-0.5"><MapPin size={11} aria-hidden="true" />{c.location}</span>}
                </p>
                {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-bridge-600 hover:underline">{c.website.replace(/^https?:\/\//, "")} <ExternalLink size={11} aria-hidden="true" /></a>}
              </div>
            </div>
            {c.description && <p className="line-clamp-3 text-sm text-muted">{c.description}</p>}
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Listings</dt><dd className="font-medium">{c.listings.total}</dd></div>
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">Live</dt><dd className="font-medium">{c.listings.live}</dd></div>
              <div className="rounded-lg bg-page px-2 py-1.5"><dt className="text-muted">In review</dt><dd className="font-medium">{c.listings.pending}</dd></div>
            </dl>
            <p className="text-xs text-muted">
              {c.owner ? <>Owner: {c.owner.name} · {c.owner.email}{c.owner.suspended && <span className="text-danger-600"> · suspended</span>}</> : "Managed by admins (no recruiter owner)"} · added <TimeAgo date={c.createdAt} />
            </p>
            {c.verificationNote && <p className="text-xs text-muted">Last note: {c.verificationNote}</p>}
            <div className="mt-auto flex flex-wrap items-center gap-1.5">
              {!c.isVerified && <ActionButton busy={busy === `${c.id}:verify`} onClick={() => decide(c.id, "verify")}>Verify</ActionButton>}
              {!c.isVerified && !c.reviewedAt && c.owner && <NoteAction label="Decline" placeholder="Optional note to the recruiter" busy={busy === `${c.id}:reject`} onConfirm={(note) => decide(c.id, "reject", note)} />}
              {c.isVerified && <NoteAction label="Remove verification" placeholder="Optional note to the recruiter" busy={busy === `${c.id}:unverify`} onConfirm={(note) => decide(c.id, "unverify", note)} />}
            </div>
          </motion.li>
        ))}
      </ul>
      {!items.length && <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No companies here.</p>}
    </div>
  );
}
