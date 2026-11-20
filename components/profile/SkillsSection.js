"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { useSectionSave } from "@/hooks/useSectionSave";
import { cn } from "@/lib/utils/cn";
import { SaveRow, SectionCard } from "./fields";

const LEVELS = ["Beginner", "Basic", "Comfortable", "Strong", "Expert"];

export default function SkillsSection({ profile, skillOptions, onSaved }) {
  const listId = useId();
  const [skills, setSkills] = useState((profile.skills ?? []).map(({ name, proficiency }) => ({ name, proficiency })));
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState("");
  const { save, status, error, clearError } = useSectionSave("skills", onSaved);

  function add(e) {
    e?.preventDefault();
    const name = draft.trim();
    if (!name) return setLocalError("Type a skill first.");
    if (name.length > 60) return setLocalError("Keep skill names under 60 characters.");
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return setLocalError("You already added that skill.");
    if (skills.length >= 40) return setLocalError("You can add up to 40 skills.");
    const canonical = skillOptions.find((o) => o.toLowerCase() === name.toLowerCase()) ?? name;
    setSkills((s) => [...s, { name: canonical, proficiency: 3 }]);
    setDraft("");
    setLocalError("");
    clearError();
  }

  const setLevel = (name, proficiency) => setSkills((s) => s.map((x) => (x.name === name ? { ...x, proficiency } : x)));
  const remove = (name) => setSkills((s) => s.filter((x) => x.name !== name));

  return (
    <SectionCard
      title="Skills"
      description="Recruiters filter students by these. Rate yourself honestly; assessments can verify them later."
      footer={<SaveRow status={status} error={error} onClick={() => save({ skills })} />}
    >
      <form onSubmit={add} className="flex gap-2">
        <label htmlFor={`${listId}-input`} className="sr-only">Add a skill</label>
        <input
          id={`${listId}-input`}
          list={listId}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setLocalError(""); }}
          placeholder="Add a skill, like Python or React"
          className="h-10 flex-1 rounded-xl border border-line px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-arena-400 focus:ring-4 focus:ring-arena-50"
        />
        <datalist id={listId}>
          {skillOptions.map((o) => <option key={o} value={o} />)}
        </datalist>
        <button type="submit" className="inline-flex items-center gap-1 rounded-full border border-arena-600 px-4 text-sm text-arena-600 transition-colors hover:bg-arena-600 hover:text-white">
          <Plus size={15} aria-hidden="true" /> Add
        </button>
      </form>
      {localError && <p role="alert" className="mt-2 text-sm text-danger-600">{localError}</p>}

      {skills.length === 0 ? (
        <p className="mt-4 rounded-xl bg-page px-4 py-6 text-center text-sm text-muted">Add at least three skills to complete your profile.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {skills.map((s) => (
              <motion.li
                key={s.name}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="group flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 transition-colors hover:border-arena-200"
              >
                <span className="truncate text-sm font-medium">{s.name}</span>
                <span className="flex items-center gap-2">
                  <span className="flex gap-1" role="radiogroup" aria-label={`${s.name} level`}>
                    {LEVELS.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={s.proficiency === i + 1}
                        aria-label={label}
                        title={label}
                        onClick={() => setLevel(s.name, i + 1)}
                        className={cn("size-2.5 rounded-full transition-all duration-200 hover:scale-125", i < s.proficiency ? "bg-arena-600" : "bg-arena-50")}
                      />
                    ))}
                  </span>
                  <button type="button" onClick={() => remove(s.name)} aria-label={`Remove ${s.name}`} className="rounded-full p-1 text-muted transition-colors hover:bg-danger-50 hover:text-danger-600">
                    <X size={14} />
                  </button>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </SectionCard>
  );
}
