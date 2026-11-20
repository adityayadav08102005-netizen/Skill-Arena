"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MODE_LABEL, TYPE_LABEL } from "@/lib/utils/format";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

export const LISTING_STATUS = {
  published: ["Live", "bg-bridge-50 text-bridge-800"],
  pending_review: ["In review", "bg-xp-50 text-xp-800"],
  draft: ["Draft", "bg-page text-muted"],
  closed: ["Closed", "bg-page text-muted"],
  rejected: ["Changes needed", "bg-danger-50 text-danger-800"],
};

const ACTIONS = {
  published: [["close", "Close"]],
  pending_review: [["close", "Close"], ["draft", "Back to draft"]],
  draft: [["publish", "Publish"]],
  closed: [["reopen", "Reopen"]],
  rejected: [["publish", "Resubmit"], ["draft", "Back to draft"]],
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short" }) : "No deadline");

/** Your listings with status, applicant counts and inline state changes. */
export default function ListingsTable({ listings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState("");

  async function act(id, action) {
    setBusy(`${id}:${action}`);
    setError("");
    const res =
      action === "delete"
        ? await fetch(`/api/recruiter/listings/${id}`, { method: "DELETE" }).catch(() => null)
        : await fetch(`/api/recruiter/listings/${id}/state`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    setConfirmDelete(null);
    if (!res?.ok) return setError(data?.error || "Couldn't update the listing.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {listings.map((l, i) => {
            const [label, tone] = LISTING_STATUS[l.status] ?? [l.status, "bg-page text-muted"];
            return (
              <motion.li
                key={l.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-card border border-line bg-panel p-4 transition-colors hover:border-bridge-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/recruiter/listings/${l.id}`} className="font-medium hover:text-bridge-800">{l.title}</Link>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px]", tone)}>{label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{TYPE_LABEL[l.type]} · {MODE_LABEL[l.workMode]} · {l.location} · closes {fmt(l.deadline)}</p>
                    {l.status === "rejected" && l.moderationNote && <p className="mt-1 text-xs text-danger-600">Admin note: {l.moderationNote}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <Link href={`/recruiter/listings/${l.id}`} className="inline-flex items-center gap-1 rounded-full bg-bridge-50 px-3 py-1.5 text-bridge-800 transition-transform hover:-translate-y-0.5">
                      <Users size={14} aria-hidden="true" /> {l.applicants} applicant{l.applicants === 1 ? "" : "s"}
                    </Link>
                    <Link href={`/recruiter/listings/${l.id}/edit`} aria-label={`Edit ${l.title}`} className="rounded-full p-2 text-muted transition-colors hover:bg-page hover:text-ink">
                      <Pencil size={15} />
                    </Link>
                    {(ACTIONS[l.status] ?? []).map(([action, text]) => (
                      <button key={action} type="button" onClick={() => act(l.id, action)} disabled={Boolean(busy)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 transition-colors hover:border-bridge-200">
                        {busy === `${l.id}:${action}` && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} {text}
                      </button>
                    ))}
                    {l.applicants === 0 &&
                      (confirmDelete === l.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button type="button" onClick={() => act(l.id, "delete")} className="rounded-full bg-danger-600 px-3 py-1.5 text-white">Delete for good</button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="px-2 text-muted hover:text-ink">Cancel</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(l.id)} aria-label={`Delete ${l.title}`} className="rounded-full p-2 text-muted transition-colors hover:bg-danger-50 hover:text-danger-600">
                          <Trash2 size={15} />
                        </button>
                      ))}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
