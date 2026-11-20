"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Download, ExternalLink, Loader2, Mail, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApplicationStatus, applicationLabel } from "@/components/dashboard/StatusPill";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import CandidateDetails from "./CandidateDetails";

const ACTIONS = [
  ["under_review", "Under review"],
  ["shortlisted", "Shortlist"],
  ["interview_scheduled", "Schedule interview"],
  ["selected", "Select"],
  ["rejected", "Reject"],
];
const fmt = (d) => new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Slide-over with a candidate's full profile, application and pipeline actions. */
export default function CandidatePanel({ applicationId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    fetch(`/api/recruiter/applications/${applicationId}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!cancelled) {
          if (r.ok) setData(d);
          else setError(d.error || "Couldn't load the candidate.");
        }
      })
      .catch(() => !cancelled && setError("Couldn't load the candidate."));
    return () => {
      cancelled = true;
    };
  }, [applicationId, reload]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function changeStatus(e) {
    e.preventDefault();
    if (action === "interview_scheduled" && !when) return setError("Pick the interview date and time.");
    setBusy("status");
    setError("");
    const res = await fetch(`/api/recruiter/applications/${applicationId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, note, interviewAt: when ? new Date(when).toISOString() : "" }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) return setError(d?.error || "Couldn't update the status.");
    setNotice(`Moved to ${applicationLabel(d.status)}. The candidate has been notified.`);
    setAction(null);
    setNote("");
    setWhen("");
    setReload((n) => n + 1);
    onChanged?.();
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!message.trim()) return setError("Write a message first.");
    setBusy("message");
    setError("");
    const res = await fetch(`/api/recruiter/applications/${applicationId}/message`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: message }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) return setError(d?.error || "Couldn't send the message.");
    setMessage("");
    setNotice("Message sent. It appears in the candidate's notifications and applications.");
    setReload((n) => n + 1);
  }

  return (
    <AnimatePresence>
      {applicationId && (
        <>
          <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-ink/20 backdrop-blur-[2px]" aria-hidden="true" />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Candidate"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-xl flex-col bg-panel shadow-float"
          >
            <header className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
              <span className="text-sm text-muted">{data ? data.listing.title : "Candidate"}</span>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted transition-colors hover:bg-page hover:text-ink"><X size={18} /></button>
            </header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              {!data && !error && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading…</p>}
              {error && <p role="alert" className="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-800">{error}</p>}
              {notice && <p role="status" className="rounded-xl bg-bridge-50 px-3 py-2 text-sm text-bridge-800">{notice}</p>}
              {data && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <ApplicationStatus status={data.status} />
                    {data.match && <span className="rounded-full bg-page px-2.5 py-0.5 text-xs text-muted">{data.match.score}% match</span>}
                    <span className="text-xs text-muted">applied {fmt(data.appliedAt)}</span>
                    {data.interviewAt && data.status === "interview_scheduled" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-arena-50 px-2.5 py-0.5 text-xs text-arena-800"><CalendarClock size={12} aria-hidden="true" /> {fmt(data.interviewAt)}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    {data.hasResume && (
                      <a href={`/api/applications/${data.id}/resume`} className="inline-flex items-center gap-1.5 rounded-full bg-bridge-600 px-3.5 py-1.5 text-white transition-transform hover:-translate-y-0.5">
                        <Download size={14} aria-hidden="true" /> Resume they sent
                      </a>
                    )}
                    {data.candidate && (
                      <Link href={`/recruiter/students/${data.candidate.userId}?application=${data.id}`} className="inline-flex items-center gap-1 rounded-full border border-line px-3.5 py-1.5 transition-colors hover:border-bridge-200">
                        Full profile <ExternalLink size={13} aria-hidden="true" />
                      </Link>
                    )}
                    {data.email ? (
                      <a href={`mailto:${data.email}`} className="inline-flex items-center gap-1 rounded-full border border-line px-3.5 py-1.5 transition-colors hover:border-bridge-200">
                        <Mail size={14} aria-hidden="true" /> {data.email}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-page px-3.5 py-1.5 text-xs text-muted"><Mail size={13} aria-hidden="true" /> Email shared once shortlisted</span>
                    )}
                  </div>

                  {data.status !== "withdrawn" ? (
                    <section className="rounded-2xl border border-line p-4">
                      <h3 className="mb-2 text-sm font-medium">Move this candidate</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {ACTIONS.filter(([s]) => s !== data.status || s === "interview_scheduled").map(([s, label]) => (
                          <button
                            key={s}
                            type="button"
                            aria-pressed={action === s}
                            onClick={() => { setAction(action === s ? null : s); setError(""); setNotice(""); }}
                            className={cn(
                              "rounded-full px-3 py-1.5 text-sm transition-all hover:-translate-y-0.5",
                              action === s ? (s === "rejected" ? "bg-danger-600 text-white" : "bg-bridge-600 text-white") : s === "rejected" ? "border border-danger-50 text-danger-600" : "border border-line",
                            )}
                          >
                            {s === "interview_scheduled" && data.status === "interview_scheduled" ? "Reschedule" : label}
                          </button>
                        ))}
                      </div>
                      <AnimatePresence initial={false}>
                        {action && (
                          <motion.form onSubmit={changeStatus} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="space-y-2 pt-3">
                              {action === "interview_scheduled" && (
                                <label className="block text-xs text-muted">
                                  Interview date and time
                                  <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-bridge-400" />
                                </label>
                              )}
                              <label className="block text-xs text-muted">
                                Note to the candidate (optional)
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-bridge-400" placeholder={action === "rejected" ? "Thanks for applying. We went with candidates closer to…" : "Interview link, what to prepare…"} />
                              </label>
                              <button type="submit" disabled={busy === "status"} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-sm text-white">
                                {busy === "status" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Confirm and notify
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </section>
                  ) : (
                    <p className="rounded-xl bg-page px-3 py-2 text-sm text-muted">The candidate withdrew this application.</p>
                  )}

                  {data.contactable && (
                    <section className="rounded-2xl border border-line p-4">
                      <h3 className="mb-2 text-sm font-medium">Message the candidate</h3>
                      {data.messages.length > 0 && (
                        <ul className="mb-3 space-y-1.5">
                          {data.messages.map((m, i) => (
                            <li key={i} className="rounded-lg bg-page px-3 py-2 text-sm">
                              <p className="whitespace-pre-line">{m.body}</p>
                              <span className="text-[11px] text-muted">{fmt(m.at)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form onSubmit={sendMessage} className="flex gap-2">
                        <label className="sr-only" htmlFor="msg">Message</label>
                        <textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={2000} placeholder="Next steps, documents, a call time…" className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-bridge-400" />
                        <button type="submit" disabled={busy === "message"} aria-label="Send message" className="self-end rounded-full bg-bridge-600 p-2.5 text-white transition-transform hover:-translate-y-0.5">
                          {busy === "message" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                      </form>
                    </section>
                  )}

                  {data.coverLetter && (
                    <section>
                      <h3 className="mb-1 text-xs font-medium text-muted">Cover letter</h3>
                      <p className="whitespace-pre-line text-sm">{data.coverLetter}</p>
                    </section>
                  )}

                  {data.match && (
                    <p className="text-xs text-muted">
                      Has {data.match.matchedSkills.join(", ") || "none of the required skills"}{data.match.missingSkills.length ? ` · missing ${data.match.missingSkills.join(", ")}` : ""}
                    </p>
                  )}

                  <CandidateDetails c={data.candidate} compact />

                  <section>
                    <h3 className="mb-2 text-xs font-medium text-muted">History</h3>
                    <ol className="relative space-y-2 border-l border-bridge-50 pl-4 text-sm">
                      {data.history.map((h, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-panel bg-bridge-400" aria-hidden="true" />
                          {applicationLabel(h.status)} <span className="text-xs text-muted">· {fmt(h.at)}</span>
                          {h.note && <p className="text-xs text-muted">{h.note}</p>}
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
