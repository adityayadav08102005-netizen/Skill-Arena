"use client";

import { motion } from "motion/react";
import { BadgeCheck, Ban, Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/app/Avatar";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { ActionButton, ErrorLine, NoteAction, Pill, useAdminAction } from "./shared";

const ROLE_TONE = { student: "arena", recruiter: "bridge", admin: "xp" };
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric" }) : "–");

function RoleSwitch({ user, run, busy }) {
  const target = user.role === "student" ? "recruiter" : "student";
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const key = `${user.id}:role`;
  const needsCompany = target === "recruiter" && !user.company;
  const submit = async () => {
    const ok = await run(`/api/admin/users/${user.id}/role`, { role: target, ...(needsCompany ? { companyName: company } : {}) }, { key });
    if (ok) setOpen(false);
  };
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-line px-3 py-1.5 text-sm transition-colors hover:border-arena-300">Make {target}</button>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-page p-1.5">
      {needsCompany && (
        <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="Company they recruit for" aria-label="Company name" className="h-8 rounded-full border border-line bg-panel px-3 text-sm outline-none focus:border-arena-300" autoFocus />
      )}
      <ActionButton tone="arena" busy={busy === key} disabled={needsCompany && !company.trim()} onClick={submit}>Confirm: {target}</ActionButton>
      <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm text-muted hover:text-ink">Cancel</button>
    </span>
  );
}

/** Accounts with role switching and suspension. Admin accounts are read-only here. */
export default function UsersTable({ items, selfId }) {
  const { run, busy, error } = useAdminAction();
  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <ul className="space-y-2">
        {items.map((u, i) => {
          const locked = u.role === "admin" || u.id === selfId;
          return (
            <motion.li key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-panel p-3 transition-colors hover:border-arena-300">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar userId={u.id} name={u.name} hasAvatar={u.hasAvatar} image={u.image} size="sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium">{u.name}</span>
                    <Pill tone={ROLE_TONE[u.role]}>{u.role}</Pill>
                    {u.suspended && <Pill tone="danger"><Ban size={11} aria-hidden="true" /> Suspended</Pill>}
                    {!u.onboarded && <Pill>Setup not finished</Pill>}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {u.email} · joined {fmt(u.joinedAt)}
                    {u.role === "student" && ` · Lv ${u.level} · ${u.xp.toLocaleString("en-IN")} XP`}
                    {u.company && <> · {u.company.name} {u.company.isVerified && <BadgeCheck size={11} className="inline text-bridge-600" aria-label="verified" />}</>}
                  </p>
                  {u.suspended && u.banReason && <p className="text-xs text-danger-600">Reason: {u.banReason}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/u/${u.id}`} aria-label={`Public profile of ${u.name}`} className="rounded-full p-2 text-muted transition-colors hover:bg-page hover:text-ink"><Eye size={15} /></Link>
                {locked ? (
                  <span className="px-2 text-xs text-muted">{u.id === selfId ? "This is you" : "Managed with make-admin"}</span>
                ) : (
                  <>
                    {!u.suspended && <RoleSwitch user={u} run={run} busy={busy} />}
                    {u.suspended ? (
                      <ActionButton tone="outline" busy={busy === `${u.id}:restore`} onClick={() => run(`/api/admin/users/${u.id}/suspend`, { suspended: false }, { key: `${u.id}:restore` })}>Restore</ActionButton>
                    ) : (
                      <NoteAction label="Suspend" required placeholder={u.role === "recruiter" ? "Why? Their open listings will be closed." : "Why is this account being suspended?"} busy={busy === `${u.id}:suspend`} onConfirm={(reason) => run(`/api/admin/users/${u.id}/suspend`, { suspended: true, reason }, { key: `${u.id}:suspend` })} />
                    )}
                  </>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
      {!items.length && <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No accounts match these filters.</p>}
    </div>
  );
}
