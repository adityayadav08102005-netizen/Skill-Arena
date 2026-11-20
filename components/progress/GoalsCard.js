"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pencil, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProgressRing from "@/components/common/ProgressRing";
import { SaveRow, TextField } from "@/components/profile/fields";
import { useSectionSave } from "@/hooks/useSectionSave";

/** Weekly goals with rings, plus an inline editor for the targets. */
export default function GoalsCard({ goals, week, monthXp }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ weeklyProblems: String(goals.weeklyProblems), weeklyActiveDays: String(goals.weeklyActiveDays), monthlyXp: String(goals.monthlyXp) });
  const [localError, setLocalError] = useState("");
  const { save, status, error, clearError } = useSectionSave("goals", () => {
    setEditing(false);
    router.refresh();
  });

  const pct = (v, t) => Math.min(100, Math.round((v / t) * 100));
  const rings = [
    { label: "Problems solved", value: week.solved, target: goals.weeklyProblems, tone: "arena" },
    { label: "Active days", value: week.activeDays, target: goals.weeklyActiveDays, tone: "bridge" },
    { label: "XP this month", value: monthXp, target: goals.monthlyXp, tone: "xp" },
  ];

  function submit() {
    const body = { weeklyProblems: Number(form.weeklyProblems), weeklyActiveDays: Number(form.weeklyActiveDays), monthlyXp: Number(form.monthlyXp) };
    if (Object.values(body).some((v) => !Number.isInteger(v))) return setLocalError("Use whole numbers for every goal.");
    setLocalError("");
    save(body);
  }

  return (
    <section className="rounded-card border border-line bg-panel p-5">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium">
          <span className="flex size-7 items-center justify-center rounded-lg bg-arena-50 text-arena-600"><Target size={15} aria-hidden="true" /></span>
          Goals
        </h2>
        <span className="flex items-center gap-3 text-xs text-muted">
          {week.daysLeft} day{week.daysLeft === 1 ? "" : "s"} left this week
          <button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-arena-600 transition-colors hover:bg-arena-50" aria-expanded={editing}>
            <Pencil size={12} aria-hidden="true" /> {editing ? "Close" : "Edit goals"}
          </button>
        </span>
      </header>

      <ul className="grid grid-cols-3 gap-3">
        {rings.map((r) => {
          const done = r.value >= r.target;
          return (
            <li key={r.label} className="flex flex-col items-center gap-1.5 text-center">
              <ProgressRing percent={pct(r.value, r.target)} size={84} stroke={7} tone={r.tone} label={`${r.label}: ${r.value} of ${r.target}`}>
                {r.value}/{r.target}
              </ProgressRing>
              <span className="text-xs text-muted">{r.label}</span>
              {done && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full bg-bridge-50 px-2 py-0.5 text-[11px] text-bridge-800">Goal met</motion.span>}
            </li>
          );
        })}
      </ul>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <TextField id="goal-problems" label="Problems per week (1–50)" inputMode="numeric" value={form.weeklyProblems} onChange={(e) => { setForm((f) => ({ ...f, weeklyProblems: e.target.value })); clearError(); }} />
              <TextField id="goal-days" label="Active days per week (1–7)" inputMode="numeric" value={form.weeklyActiveDays} onChange={(e) => { setForm((f) => ({ ...f, weeklyActiveDays: e.target.value })); clearError(); }} />
              <TextField id="goal-xp" label="XP per month (50–20,000)" inputMode="numeric" value={form.monthlyXp} onChange={(e) => { setForm((f) => ({ ...f, monthlyXp: e.target.value })); clearError(); }} />
            </div>
            <div className="mt-3">
              {localError && <p role="alert" className="mb-2 text-sm text-danger-600">{localError}</p>}
              <SaveRow status={status} error={error} label="Save goals" onClick={submit} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
