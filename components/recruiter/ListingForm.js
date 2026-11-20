"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { SectionCard, SelectField, TextArea, TextField } from "@/components/profile/fields";
import { EXPERIENCE_LEVELS, OPPORTUNITY_TYPES, WORK_MODES } from "@/data/opportunities";
import { cn } from "@/lib/utils/cn";

function SkillInput({ label, value, onChange, options, hint }) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const add = (e) => {
    e?.preventDefault();
    const name = draft.trim();
    if (!name || value.some((v) => v.toLowerCase() === name.toLowerCase()) || value.length >= 20) return setDraft("");
    onChange([...value, options.find((o) => o.toLowerCase() === name.toLowerCase()) ?? name]);
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={`${listId}-in`} className="mb-1 block text-xs text-muted">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line p-1.5 focus-within:border-bridge-400 focus-within:ring-4 focus-within:ring-bridge-50">
        <AnimatePresence initial={false}>
          {value.map((s) => (
            <motion.span key={s} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="inline-flex items-center gap-1 rounded-lg bg-bridge-50 px-2 py-1 text-xs text-bridge-800">
              {s}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="rounded hover:text-danger-600"><X size={12} /></button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={`${listId}-in`}
          list={listId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") add(e);
            if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={value.length ? "" : "Type a skill and press Enter"}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none"
        />
        <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/** Create or edit a listing. `listing` is null for a new one. */
export default function ListingForm({ listing, skillOptions, companyVerified }) {
  const router = useRouter();
  const year = new Date().getFullYear();
  const yearChoices = Array.from({ length: 6 }, (_, i) => year - 1 + i);
  const [v, setV] = useState({
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    type: listing?.type ?? "internship",
    workMode: listing?.workMode ?? "hybrid",
    location: listing?.location ?? "",
    experienceLevel: listing?.experienceLevel ?? "fresher",
    requiredSkills: listing?.requiredSkills ?? [],
    preferredSkills: listing?.preferredSkills ?? [],
    eligibility: listing?.eligibility ?? "",
    graduationYears: listing?.graduationYears ?? [],
    salaryMin: listing?.salary?.min != null ? String(listing.salary.min) : "",
    salaryMax: listing?.salary?.max != null ? String(listing.salary.max) : "",
    salaryPeriod: listing?.salary?.period ?? "month",
    deadline: toDateInput(listing?.applicationDeadline),
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const set = (key) => (e) => {
    setV((s) => ({ ...s, [key]: e?.target ? e.target.value : e }));
    setError("");
  };

  async function submit(status) {
    if (!v.title.trim() || !v.description.trim() || !v.location.trim()) return setError("Add a title, description and location.");
    if (!v.requiredSkills.length) return setError("Add at least one required skill.");
    setBusy(status);
    setError("");
    const body = {
      title: v.title,
      description: v.description,
      type: v.type,
      workMode: v.workMode,
      location: v.location,
      experienceLevel: v.experienceLevel,
      requiredSkills: v.requiredSkills,
      preferredSkills: v.preferredSkills,
      eligibility: v.eligibility,
      graduationYears: v.graduationYears,
      salaryMin: v.salaryMin,
      salaryMax: v.salaryMax,
      salaryPeriod: v.salaryPeriod,
      applicationDeadline: v.deadline ? new Date(`${v.deadline}T23:59:00`).toISOString() : "",
      status,
    };
    const res = await fetch(listing ? `/api/recruiter/listings/${listing.id}` : "/api/recruiter/listings", {
      method: listing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) return setError(data?.error || "Couldn't save the listing.");
    router.push("/recruiter/listings");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit("published"); }} noValidate className="space-y-4">
      <SectionCard title="The role">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <TextField id="l-title" className="sm:col-span-2" label="Title" placeholder="Frontend developer intern" value={v.title} onChange={set("title")} />
          <SelectField id="l-type" label="Type" options={OPPORTUNITY_TYPES.map((t) => [t.key, t.label])} value={v.type} onChange={set("type")} />
          <SelectField id="l-mode" label="Work mode" options={WORK_MODES.map((t) => [t.key, t.label])} value={v.workMode} onChange={set("workMode")} />
          <TextField id="l-loc" label="Location" placeholder="Bengaluru, India" value={v.location} onChange={set("location")} />
          <SelectField id="l-exp" label="Experience" options={EXPERIENCE_LEVELS.map((t) => [t.key, t.label])} value={v.experienceLevel} onChange={set("experienceLevel")} />
          <TextArea id="l-desc" className="sm:col-span-2" rows={7} label="Description" placeholder="What the person will do, the team, and what they'll learn." value={v.description} onChange={set("description")} />
        </div>
      </SectionCard>

      <SectionCard title="Skills and eligibility" description="Students are matched to the listing on these.">
        <div className="space-y-4">
          <SkillInput label="Required skills" value={v.requiredSkills} onChange={set("requiredSkills")} options={skillOptions} />
          <SkillInput label="Nice to have" value={v.preferredSkills} onChange={set("preferredSkills")} options={skillOptions} />
          <div>
            <span className="mb-1 block text-xs text-muted">Graduation years (leave empty for any)</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Graduation years">
              {yearChoices.map((y) => {
                const on = v.graduationYears.includes(y);
                return (
                  <button
                    key={y}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("graduationYears")(on ? v.graduationYears.filter((x) => x !== y) : [...v.graduationYears, y].sort())}
                    className={cn("rounded-full px-3 py-1 text-sm transition-all hover:-translate-y-0.5", on ? "bg-bridge-600 text-white" : "border border-line text-muted")}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
          <TextArea id="l-elig" rows={3} label="Eligibility notes" placeholder="Branches, CGPA, documents, anything else." value={v.eligibility} onChange={set("eligibility")} />
        </div>
      </SectionCard>

      <SectionCard title="Pay and deadline">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-4">
          <TextField id="l-min" label="Pay from (₹)" inputMode="numeric" placeholder="25000" value={v.salaryMin} onChange={set("salaryMin")} />
          <TextField id="l-max" label="Pay to (₹)" inputMode="numeric" placeholder="30000" value={v.salaryMax} onChange={set("salaryMax")} />
          <SelectField id="l-per" label="Per" options={[["month", "Month"], ["year", "Year"], ["hour", "Hour"], ["total", "Total"]]} value={v.salaryPeriod} onChange={set("salaryPeriod")} />
          <TextField id="l-deadline" type="date" label="Application deadline" min={new Date().toISOString().slice(0, 10)} value={v.deadline} onChange={set("deadline")} />
        </div>
        <p className="mt-2 text-xs text-muted">Leave pay empty if you&apos;d rather not disclose it.</p>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={Boolean(busy)} className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-bridge-600 px-5 py-2.5 text-sm font-medium text-white before:absolute before:inset-0 before:-translate-x-[101%] before:bg-bridge-800 before:transition-transform before:duration-300 before:ease-snap hover:before:translate-x-0">
          {busy === "published" ? <Loader2 size={15} className="relative animate-spin" aria-hidden="true" /> : <Plus size={15} className="relative" aria-hidden="true" />}
          <span className="relative">{companyVerified ? (listing ? "Save and publish" : "Publish listing") : "Submit for review"}</span>
        </button>
        {(!listing || ["draft", "pending_review", "rejected"].includes(listing.status)) && (
          <button type="button" onClick={() => submit("draft")} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-5 py-2.5 text-sm transition-colors hover:border-bridge-200">
            {busy === "draft" && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Save as draft
          </button>
        )}
        {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
      </div>
    </form>
  );
}
