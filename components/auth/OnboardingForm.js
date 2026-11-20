"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building2, GraduationCap, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const ROLES = [
  { value: "student", title: "I'm a student", hint: "Practice, compete, take assessments, apply", icon: GraduationCap },
  { value: "recruiter", title: "I'm a recruiter", hint: "Post roles and review candidates", icon: Building2 },
];

const FIELDS = {
  student: [
    { key: "college", label: "College name", placeholder: "NIT Trichy", autoComplete: "organization" },
    { key: "graduationYear", label: "Graduation year", placeholder: "2027", inputMode: "numeric" },
  ],
  recruiter: [
    { key: "companyName", label: "Company name", placeholder: "Nimbus Labs", autoComplete: "organization" },
    { key: "jobTitle", label: "Your job title", placeholder: "Talent acquisition lead", autoComplete: "organization-title" },
  ],
};

/** One-time setup step after sign-up (email or Google): pick a role, add the basics. */
export default function OnboardingForm({ name, email, image }) {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "recruiter" ? "recruiter" : "student");
  const [values, setValues] = useState({ college: "", graduationYear: "", companyName: "", jobTitle: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const teal = role === "recruiter";
  const initials = (name || email).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  async function submit(e) {
    e.preventDefault();
    const fields = FIELDS[role];
    for (const f of fields) {
      if (!values[f.key].trim()) return setError(`Enter your ${f.label.toLowerCase()}.`);
    }
    if (role === "student" && !/^(19|20)\d{2}$/.test(values.graduationYear.trim())) {
      return setError("Enter a 4-digit graduation year, like 2027.");
    }
    setBusy(true);
    const body =
      role === "student"
        ? { role, college: values.college, graduationYear: Number(values.graduationYear) }
        : { role, companyName: values.companyName, jobTitle: values.jobTitle };
    const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      if (res.status === 409) return router.replace("/continue");
      return setError(data.error || "Couldn't save. Try again.");
    }
    router.replace(data.redirectTo);
    router.refresh();
  }

  return (
    <motion.form
      onSubmit={submit}
      noValidate
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="w-full max-w-md rounded-[20px] border border-line bg-panel p-6 shadow-sm sm:p-7"
    >
      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        <span className="h-1 flex-1 rounded-full bg-arena-600" />
        <span className="h-1 flex-1 rounded-full bg-arena-600" />
        <span className="h-1 flex-1 rounded-full bg-arena-50" />
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-page px-3 py-2">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Google avatar
          <img src={image} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-arena-50 text-xs font-medium text-arena-800">{initials}</span>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted">{email}</div>
        </div>
      </div>

      <h1 className="mt-5 text-lg font-medium">How will you use SkillArena?</h1>
      <p className="text-sm text-muted">You can only choose this once.</p>

      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">Account type</legend>
        {ROLES.map(({ value, title, hint, icon: Icon }) => {
          const active = role === value;
          const isTeal = value === "recruiter";
          return (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all duration-300 ease-snap hover:translate-x-1",
                active ? (isTeal ? "border-bridge-600 bg-bridge-50" : "border-arena-600 bg-arena-50") : "border-line",
              )}
            >
              <input type="radio" name="role" value={value} checked={active} onChange={() => { setRole(value); setError(""); }} className="sr-only" />
              <Icon size={20} className={isTeal ? "text-bridge-600" : "text-arena-600"} aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={role} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }} className="mt-3 space-y-3">
          {FIELDS[role].map((f) => (
            <div key={f.key}>
              <label htmlFor={`onb-${f.key}`} className="mb-1 block text-xs text-muted">{f.label}</label>
              <input
                id={`onb-${f.key}`}
                value={values[f.key]}
                onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setError(""); }}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete}
                inputMode={f.inputMode}
                className="h-10 w-full rounded-xl border border-line px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-arena-400 focus:ring-4 focus:ring-arena-50"
              />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <p role="alert" aria-live="polite" className="mt-3 min-h-5 text-sm text-danger-600">{error}</p>

      <button
        type="submit"
        disabled={busy}
        className={cn(
          "relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-2.5 text-sm font-medium text-white transition-colors duration-300",
          "before:absolute before:inset-0 before:-translate-x-[101%] before:bg-ink before:transition-transform before:duration-400 before:ease-snap hover:before:translate-x-0",
          teal ? "bg-bridge-600" : "bg-arena-600",
        )}
      >
        {busy && <Loader2 size={16} className="relative animate-spin" aria-hidden="true" />}
        <span className="relative">Continue</span>
      </button>
    </motion.form>
  );
}
