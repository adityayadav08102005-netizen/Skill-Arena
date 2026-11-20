"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, ChevronDown, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APPLICATION_STATUS_ORDER, ApplicationStatus, applicationLabel } from "@/components/dashboard/StatusPill";
import { MODE_LABEL } from "@/lib/utils/format";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import TimeAgo from "@/components/common/TimeAgo";

const FILTERS = ["all", ...APPLICATION_STATUS_ORDER, "withdrawn"];
const fmt = (d) => new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Your applications with status filters, an expandable status timeline and withdraw. */
export default function ApplicationsList({ items }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");

  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? items.length : items.filter((i) => i.status === f).length]));
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  async function withdraw(id) {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/applications/${id}/withdraw`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    setConfirm(null);
    if (!res?.ok) return setError(data?.error || "Couldn't withdraw the application.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
        {FILTERS.filter((f) => f === "all" || counts[f]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn("rounded-full px-3 py-1 text-sm transition-all hover:-translate-y-0.5", filter === f ? "bg-bridge-50 text-bridge-800" : "border border-line bg-panel text-muted hover:text-ink")}
          >
            {f === "all" ? "All" : applicationLabel(f)} <span className="text-xs">{counts[f]}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {shown.map((a, i) => {
            const expanded = open === a.id;
            return (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                className="overflow-hidden rounded-card border border-line bg-panel transition-colors hover:border-bridge-200"
              >
                <button type="button" onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.opportunity?.title ?? "Listing removed"}</span>
                    <span className="block truncate text-sm text-muted">
                      {a.opportunity ? `${a.opportunity.companyName} · ${a.opportunity.location} · ${MODE_LABEL[a.opportunity.workMode]}` : ""} · applied <TimeAgo date={a.appliedAt} />
                      {a.isSample ? " · sample data" : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <ApplicationStatus status={a.status} />
                    <ChevronDown size={16} className={cn("text-muted transition-transform duration-300", expanded && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 border-t border-line p-4 sm:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-xs font-medium text-muted">Status history</h3>
                          <ol className="relative space-y-3 border-l border-bridge-50 pl-4">
                            {a.history.map((h, idx) => (
                              <li key={idx} className="relative">
                                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-panel bg-bridge-400" aria-hidden="true" />
                                <span className="block text-sm">{applicationLabel(h.status)}</span>
                                <span className="text-xs text-muted">{fmt(h.at)}</span>
                                {h.note && <span className="block text-xs text-muted">{h.note}</span>}
                              </li>
                            ))}
                          </ol>
                          {a.interviewAt && (
                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-arena-50 px-2.5 py-1 text-sm text-arena-800">
                              <CalendarClock size={14} aria-hidden="true" /> Interview {fmt(a.interviewAt)}
                            </p>
                          )}
                          {a.statusNote && <p className="mt-2 text-sm text-muted">Note from the recruiter: {a.statusNote}</p>}
                        </div>
                        <div className="space-y-3 text-sm">
                          {a.messages.length > 0 && (
                            <div>
                              <h3 className="mb-1 text-xs font-medium text-muted">Messages from {a.opportunity?.companyName ?? "the recruiter"}</h3>
                              <ul className="space-y-1.5">
                                {a.messages.map((m, idx) => (
                                  <li key={idx} className="rounded-lg bg-bridge-50 px-3 py-2 text-bridge-800">
                                    <p className="whitespace-pre-line">{m.body}</p>
                                    <span className="text-[11px] opacity-80">{fmt(m.at)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {a.coverLetter && (
                            <div>
                              <h3 className="mb-1 text-xs font-medium text-muted">Cover letter</h3>
                              <p className="whitespace-pre-line">{a.coverLetter}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {a.opportunity && <Link href={`/skillbridge/${a.opportunity.id}`} className="rounded-full border border-line px-3 py-1.5 transition-colors hover:border-bridge-200">View listing</Link>}
                            {a.hasResume && (
                              <a href={`/api/applications/${a.id}/resume`} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 transition-colors hover:border-bridge-200">
                                <Download size={13} aria-hidden="true" /> Resume sent
                              </a>
                            )}
                            {a.withdrawable &&
                              (confirm === a.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-xs text-muted">Withdraw? This can&apos;t be undone.</span>
                                  <button type="button" onClick={() => withdraw(a.id)} disabled={busy === a.id} className="inline-flex items-center gap-1 rounded-full bg-danger-600 px-3 py-1.5 text-white">
                                    {busy === a.id && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Yes, withdraw
                                  </button>
                                  <button type="button" onClick={() => setConfirm(null)} className="rounded-full px-2 py-1.5 text-muted hover:text-ink">Keep it</button>
                                </span>
                              ) : (
                                <button type="button" onClick={() => setConfirm(a.id)} className="rounded-full px-3 py-1.5 text-danger-600 transition-colors hover:bg-danger-50">Withdraw</button>
                              ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
