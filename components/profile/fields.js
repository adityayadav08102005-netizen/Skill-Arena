"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "w-full rounded-xl border border-line bg-panel px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-arena-200 focus:border-arena-400 focus:ring-4 focus:ring-arena-50";

export function TextField({ id, label, hint, className, ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">{label}</label>
      <input id={id} className={cn(inputClass, "h-10")} {...props} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({ id, label, className, rows = 4, ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">{label}</label>
      <textarea id={id} rows={rows} className={cn(inputClass, "resize-y py-2")} {...props} />
    </div>
  );
}

export function SelectField({ id, label, options, className, ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">{label}</label>
      <select id={id} className={cn(inputClass, "h-10")} {...props}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </div>
  );
}

/** Card wrapper for an editor section with title, description and a save row. */
export function SectionCard({ title, description, children, footer }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className="rounded-card border border-line bg-panel p-5"
    >
      <h2 className="text-base font-medium">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-5 border-t border-line pt-4">{footer}</div>}
    </motion.section>
  );
}

/** Save button with sliding fill plus an inline saved/error message. */
export function SaveRow({ status, error, label = "Save changes", onClick, type = "button" }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type={type}
        onClick={onClick}
        disabled={status === "saving"}
        className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-arena-600 px-4 py-2 text-sm font-medium text-white before:absolute before:inset-0 before:-translate-x-[101%] before:bg-ink before:transition-transform before:duration-400 before:ease-snap hover:before:translate-x-0"
      >
        {status === "saving" && <Loader2 size={15} className="relative animate-spin" aria-hidden="true" />}
        <span className="relative">{status === "saving" ? "Saving…" : label}</span>
      </button>
      <AnimatePresence mode="wait">
        {status === "saved" && (
          <motion.span key="ok" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1 text-sm text-bridge-600">
            <Check size={15} aria-hidden="true" /> Saved
          </motion.span>
        )}
        {status === "error" && (
          <motion.span key="err" role="alert" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-sm text-danger-600">
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
