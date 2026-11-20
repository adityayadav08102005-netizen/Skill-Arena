"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Flag, Loader2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const REASONS = [
  ["spam", "Spam"],
  ["misleading", "Misleading"],
  ["inappropriate", "Inappropriate"],
  ["incorrect", "Incorrect content"],
  ["other", "Something else"],
];

/**
 * "Report" link that opens a small form. Reports go to the admin queue;
 * one per item per person. `what` names the item in the copy ("listing").
 */
export default function ReportButton({ entityType, entityId, what = "this", className, compact = false }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  async function send(e) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, reason, details }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setState("idle");
      return setError(data?.error || "Couldn't send the report.");
    }
    setState("sent");
  }

  if (state === "sent") {
    return <span className={cn("inline-flex items-center gap-1 text-xs text-bridge-600", className)}><Check size={13} aria-hidden="true" /> Reported. An admin will review it.</span>;
  }

  return (
    <span className={cn("relative inline-block", className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted transition-colors hover:bg-danger-50 hover:text-danger-600">
        <Flag size={12} aria-hidden="true" /> {compact ? "Report" : `Report ${what}`}
      </button>
      <AnimatePresence>
        {open && (
          <motion.form
            onSubmit={send}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-1 w-72 space-y-2 rounded-2xl border border-line bg-panel p-3 text-left text-sm shadow-float"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Report {what}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-muted hover:text-ink"><X size={14} /></button>
            </div>
            <fieldset className="flex flex-wrap gap-1.5">
              <legend className="sr-only">Reason</legend>
              {REASONS.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={reason === value} onClick={() => setReason(value)} className={cn("rounded-full px-2.5 py-1 text-xs transition-colors", reason === value ? "bg-danger-50 text-danger-800" : "border border-line text-muted hover:text-ink")}>
                  {label}
                </button>
              ))}
            </fieldset>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={2000} placeholder={reason === "other" ? "What's wrong? (required)" : "Details (optional)"} aria-label="Details" className="w-full rounded-lg border border-line px-2 py-1.5 text-sm outline-none focus:border-danger-400" />
            {error && <p role="alert" className="text-xs text-danger-600">{error}</p>}
            <button type="submit" disabled={!reason || state === "sending" || (reason === "other" && !details.trim())} className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-danger-600 px-3 py-1.5 text-white disabled:opacity-50">
              {state === "sending" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Send report
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </span>
  );
}
