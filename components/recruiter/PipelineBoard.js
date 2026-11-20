"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import Avatar from "@/components/app/Avatar";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import CandidatePanel from "./CandidatePanel";

const COLUMNS = [
  ["applied", "Applied", "border-line"],
  ["under_review", "Under review", "border-info-50"],
  ["shortlisted", "Shortlisted", "border-bridge-200"],
  ["interview_scheduled", "Interview", "border-arena-200"],
  ["selected", "Selected", "border-xp-200"],
  ["rejected", "Not selected", "border-danger-50"],
];
// The one-click "next step" offered on each card.
const NEXT = { applied: ["under_review", "Review"], under_review: ["shortlisted", "Shortlist"], shortlisted: null, interview_scheduled: ["selected", "Select"] };
const fmt = (d) => new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Kanban pipeline for one listing. Cards open the candidate panel; quick actions move them on. */
export default function PipelineBoard({ applications }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get("candidate");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const setOpen = useCallback(
    (id) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("candidate", id);
      else next.delete("candidate");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    },
    [params, pathname, router],
  );

  async function quick(e, id, status) {
    e.stopPropagation();
    setBusy(id);
    setError("");
    const res = await fetch(`/api/recruiter/applications/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) return setError(d?.error || "Couldn't move the candidate.");
    router.refresh();
  }

  const withdrawn = applications.filter((a) => a.status === "withdrawn");

  return (
    <>
      {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {COLUMNS.map(([status, label, tone]) => {
          const items = applications.filter((a) => a.status === status);
          return (
            <section key={status} className="w-64 shrink-0" aria-label={label}>
              <h2 className="mb-2 flex items-center justify-between px-1 text-xs text-muted">
                {label} <span className="rounded-full bg-panel px-2 py-0.5">{items.length}</span>
              </h2>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((a) => (
                    <motion.li key={a.id} layout layoutId={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpen(a.id)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(a.id))}
                        className={cn("group relative cursor-pointer overflow-hidden rounded-xl border bg-panel p-3 text-sm transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1 hover:border-bridge-400", tone)}
                      >
                        {a.candidate ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Avatar userId={a.candidate.userId} name={a.candidate.name} hasAvatar={a.candidate.hasAvatar} image={a.candidate.image} size="sm" />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{a.candidate.name}</div>
                                <div className="truncate text-[11px] text-muted">{a.candidate.college}{a.candidate.graduationYear ? ` · ${a.candidate.graduationYear}` : ""}</div>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                              {a.match !== null && <span className="rounded-full bg-bridge-50 px-2 py-0.5 text-bridge-800">{a.match}% match</span>}
                              <span className="rounded-full bg-page px-2 py-0.5 text-muted">Lv {a.candidate.level} · {a.candidate.solved ?? 0} solved</span>
                              {a.candidate.bestAssessment !== null && <span className="rounded-full bg-page px-2 py-0.5 text-muted">best test {a.candidate.bestAssessment}%</span>}
                              {a.candidate.verifiedSkills > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-page px-2 py-0.5 text-muted"><BadgeCheck size={11} aria-hidden="true" /> {a.candidate.verifiedSkills}</span>}
                            </div>
                            {a.status === "interview_scheduled" && a.interviewAt && <div className="mt-1.5 text-[11px] text-arena-800">Interview {fmt(a.interviewAt)}</div>}
                          </>
                        ) : (
                          <span className="text-muted">Profile unavailable</span>
                        )}
                        {NEXT[status] && (
                          <div className="mt-2 flex gap-1.5 transition-all duration-300 ease-snap md:max-h-0 md:translate-y-2 md:opacity-0 md:group-focus-within:max-h-10 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 md:group-hover:max-h-10 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                            <button type="button" onClick={(e) => quick(e, a.id, NEXT[status][0])} disabled={busy === a.id} className="inline-flex items-center gap-1 rounded-full bg-bridge-600 px-2.5 py-1 text-[11px] text-white">
                              {busy === a.id && <Loader2 size={11} className="animate-spin" aria-hidden="true" />} {NEXT[status][1]}
                            </button>
                            <button type="button" onClick={(e) => quick(e, a.id, "rejected")} disabled={busy === a.id} className="rounded-full bg-danger-50 px-2.5 py-1 text-[11px] text-danger-800">Reject</button>
                          </div>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {!items.length && <li className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-muted">Nobody here</li>}
              </ul>
            </section>
          );
        })}
      </div>
      {withdrawn.length > 0 && (
        <p className="text-xs text-muted">
          Withdrawn: {withdrawn.map((a, i) => (
            <button key={a.id} type="button" onClick={() => setOpen(a.id)} className="hover:underline">{a.candidate?.name ?? "Candidate"}{i < withdrawn.length - 1 ? ", " : ""}</button>
          ))}
        </p>
      )}
      <CandidatePanel applicationId={open} onClose={() => setOpen(null)} onChanged={() => router.refresh()} />
    </>
  );
}
