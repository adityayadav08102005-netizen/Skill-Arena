"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Calls an admin API and refreshes the page on success.
 *   const { run, busy, error } = useAdminAction();
 *   await run(`/api/admin/listings/${id}`, { action: "approve" }, { key: id })
 */
export function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  async function run(url, body, { method = "POST", key = url, refresh = true } = {}) {
    setBusy(key);
    setError("");
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) {
      setError(data?.error || "That didn't work. Try again.");
      return null;
    }
    if (refresh) router.refresh();
    return data ?? {};
  }
  return { run, busy, error, setError };
}

/** Status pill. */
export function Pill({ tone = "muted", children }) {
  const tones = {
    muted: "bg-page text-muted",
    arena: "bg-arena-50 text-arena-800",
    bridge: "bg-bridge-50 text-bridge-800",
    xp: "bg-xp-50 text-xp-800",
    danger: "bg-danger-50 text-danger-800",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", tones[tone])}>{children}</span>;
}

/** Link tabs whose highlight slides between them (state lives in the URL). */
export function LinkTabs({ tabs, active, param = "status", ariaLabel = "Filter" }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const hrefFor = (value) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    next.delete("page");
    return `${pathname}${next.size ? `?${next}` : ""}`;
  };
  return (
    <nav aria-label={ariaLabel} className="inline-flex max-w-full flex-wrap rounded-[18px] border border-line bg-panel p-1 shadow-float">
      {tabs.map((t) => {
        const on = t.value === active;
        return (
          <Link key={t.value || "all"} href={hrefFor(t.value)} scroll={false} aria-current={on ? "page" : undefined} className={cn("relative rounded-full px-3.5 py-1.5 text-sm transition-colors", on ? "text-arena-800" : "text-muted hover:text-ink")}>
            {on && <motion.span layoutId={`tabs-${param}`} className="absolute inset-0 rounded-full bg-arena-50" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">
              {t.label}
              {t.count !== undefined && <span className="ml-1 text-xs opacity-70">{t.count}</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Search box and selects that write to the URL; the server page reads them.
 * fields: [{ name, label, options: [[value, label]] }]
 */
export function FilterBar({ values, fields = [], placeholder = "Search" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(values.q ?? "");
  const first = useRef(true);

  const update = (changes) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed query should trigger this
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-panel p-1.5 shadow-float">
      <label className="relative flex min-w-48 flex-1 items-center">
        <span className="sr-only">{placeholder}</span>
        {pending ? <Loader2 size={15} className="absolute left-3 animate-spin text-muted" aria-hidden="true" /> : <Search size={15} className="absolute left-3 text-muted" aria-hidden="true" />}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-full bg-page pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-arena-100" />
      </label>
      {fields.map((f) => (
        <label key={f.name}>
          <span className="sr-only">{f.label}</span>
          <select value={values[f.name] ?? ""} onChange={(e) => update({ [f.name]: e.target.value })} className="h-9 rounded-full bg-page px-3 text-sm outline-none">
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}

/**
 * A button that opens an inline note box before confirming (send back,
 * suspend, take down). `required` makes the note mandatory.
 */
export function NoteAction({ label, confirmLabel, placeholder, required = false, danger = true, busy, onConfirm, className }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.span key="form" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full min-w-64 flex-col gap-1.5 rounded-xl border border-line bg-page p-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder={placeholder} aria-label={`${label}: note`} className="w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm outline-none focus:border-arena-300" autoFocus />
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || (required && !note.trim())}
                onClick={async () => {
                  const ok = await onConfirm(note.trim() || undefined);
                  if (ok) {
                    setOpen(false);
                    setNote("");
                  }
                }}
                className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-white disabled:opacity-50", danger ? "bg-danger-600" : "bg-arena-600")}
              >
                {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} {confirmLabel ?? label}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm text-muted hover:text-ink">Cancel</button>
            </span>
          </motion.span>
        ) : (
          <motion.button key="btn" type="button" onClick={() => setOpen(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("rounded-full px-3 py-1.5 text-sm transition-colors", danger ? "text-danger-600 hover:bg-danger-50" : "border border-line hover:border-arena-300")}>
            {label}
          </motion.button>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Small primary action button with a spinner. */
export function ActionButton({ busy, onClick, children, tone = "bridge", disabled, className }) {
  const tones = {
    bridge: "bg-bridge-600 text-white hover:bg-bridge-800",
    arena: "bg-arena-600 text-white hover:bg-arena-800",
    outline: "border border-line bg-panel hover:border-arena-300",
  };
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-[background-color,translate,border-color] hover:-translate-y-0.5 disabled:opacity-50", tones[tone], className)}>
      {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} {children}
    </button>
  );
}

export function ErrorLine({ error }) {
  return error ? <p role="alert" className="text-sm text-danger-600">{error}</p> : null;
}
