"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Flag, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ASSESSMENT_CATEGORIES } from "@/data/assessments";
import { cn } from "@/lib/utils/cn";
import { ErrorLine, Pill, useAdminAction } from "./shared";

const input = "w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none transition-colors focus:border-arena-400";
const DIFF_TONE = { easy: "bridge", medium: "xp", hard: "danger" };
const blank = (category) => ({ category: category || "python", topic: "", difficulty: "medium", prompt: "", options: ["", "", "", ""], answer: 0, explanation: "", isActive: true });

/** Slide-over editor for one question. */
function Editor({ question, defaultCategory, onClose }) {
  const router = useRouter();
  const [f, setF] = useState(() => (question ? { ...question, options: [...question.options] } : blank(defaultCategory)));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage("");
    const body = { category: f.category, topic: f.topic, difficulty: f.difficulty, prompt: f.prompt, options: f.options, answer: f.answer, explanation: f.explanation, isActive: f.isActive };
    const res = await fetch(question ? `/api/admin/questions/${question.id}` : "/api/admin/questions", { method: question ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) {
      const byField = {};
      for (const d of data?.details ?? []) byField[d.path.split(".")[0]] ??= d.message;
      setErrors(byField);
      setMessage(data?.error || "Couldn't save the question.");
      return;
    }
    router.refresh();
    onClose();
  }

  const setOption = (i, value) => setF((s) => ({ ...s, options: s.options.map((o, j) => (j === i ? value : o)) }));
  const removeOption = (i) => setF((s) => ({ ...s, options: s.options.filter((_, j) => j !== i), answer: s.answer === i ? 0 : s.answer > i ? s.answer - 1 : s.answer }));

  return (
    <motion.div className="fixed inset-0 z-[60] flex justify-end bg-ink/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        role="dialog"
        aria-modal="true"
        aria-label={question ? "Edit question" : "New question"}
        className="flex h-full w-full max-w-xl flex-col gap-4 overflow-y-auto border-l border-line bg-panel p-5 shadow-float"
        noValidate
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{question ? "Edit question" : "New question"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Category</span>
            <select value={f.category} onChange={(e) => setF((s) => ({ ...s, category: e.target.value }))} className={input}>
              {ASSESSMENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Difficulty</span>
            <select value={f.difficulty} onChange={(e) => setF((s) => ({ ...s, difficulty: e.target.value }))} className={input}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </label>
          <label className="col-span-2 space-y-1 text-sm">
            <span className="font-medium">Topic</span>
            <input value={f.topic} onChange={(e) => setF((s) => ({ ...s, topic: e.target.value }))} maxLength={80} placeholder="e.g. Normalization" className={input} />
            {errors.topic && <span className="block text-xs text-danger-600">{errors.topic}</span>}
          </label>
          <label className="col-span-2 space-y-1 text-sm">
            <span className="font-medium">Question</span>
            <textarea value={f.prompt} onChange={(e) => setF((s) => ({ ...s, prompt: e.target.value }))} rows={4} maxLength={2000} className={input} />
            {errors.prompt && <span className="block text-xs text-danger-600">{errors.prompt}</span>}
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Options <span className="font-normal text-muted">· pick the correct one</span></legend>
          {f.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <button type="button" onClick={() => setF((s) => ({ ...s, answer: i }))} aria-label={`Mark option ${i + 1} correct`} aria-pressed={f.answer === i} className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors", f.answer === i ? "border-bridge-600 bg-bridge-600 text-white" : "border-line text-muted hover:border-bridge-400")}>
                {f.answer === i ? <Check size={14} /> : String.fromCharCode(65 + i)}
              </button>
              <input value={o} onChange={(e) => setOption(i, e.target.value)} maxLength={500} aria-label={`Option ${i + 1}`} className={input} />
              <button type="button" onClick={() => removeOption(i)} disabled={f.options.length <= 2} aria-label={`Remove option ${i + 1}`} className="rounded-full p-2 text-muted hover:text-danger-600 disabled:opacity-30"><Trash2 size={14} /></button>
            </div>
          ))}
          {f.options.length < 6 && <button type="button" onClick={() => setF((s) => ({ ...s, options: [...s.options, ""] }))} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Plus size={13} aria-hidden="true" /> Add option</button>}
          {(errors.options || errors.answer) && <p className="text-xs text-danger-600">{errors.options || errors.answer}</p>}
        </fieldset>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Explanation</span>
          <span className="block text-xs text-muted">Shown in the review after a student submits.</span>
          <textarea value={f.explanation} onChange={(e) => setF((s) => ({ ...s, explanation: e.target.value }))} rows={3} maxLength={2000} className={input} />
        </label>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF((s) => ({ ...s, isActive: e.target.checked }))} className="accent-arena-600" /> Active (can be drawn in new attempts)</label>
        <div className="mt-auto flex items-center justify-end gap-3 border-t border-line pt-3">
          {message && <span role="alert" className="text-sm text-danger-600">{message}</span>}
          <button type="button" onClick={onClose} className="px-3 text-sm text-muted hover:text-ink">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-arena-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} {question ? "Save" : "Add question"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/** Question list with coverage per category, editing in a slide-over. `?edit=<id>` opens one directly. */
export default function QuestionBank({ items, coverage, category }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { run, busy, error } = useAdminAction();
  const [editing, setEditing] = useState(null); // null | "new" | question
  const [confirm, setConfirm] = useState(null);
  const editId = params.get("edit");
  const fromUrl = editId ? items.find((q) => q.id === editId) : null;
  const current = editing ?? fromUrl;

  const close = () => {
    setEditing(null);
    if (editId) {
      const next = new URLSearchParams(params.toString());
      next.delete("edit");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }
  };
  const toggle = (q) => run(`/api/admin/questions/${q.id}`, { category: q.category, topic: q.topic, difficulty: q.difficulty, prompt: q.prompt, options: q.options, answer: q.answer, explanation: q.explanation || undefined, isActive: !q.isActive }, { method: "PATCH", key: `${q.id}:toggle` });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-card border border-line bg-panel">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="px-4 pt-3 text-left text-xs text-muted">Active questions per category. Easy, medium or hard tests need at least 3 of that difficulty.</caption>
          <thead>
            <tr className="text-left text-xs text-muted"><th className="px-4 py-2 font-normal">Category</th><th className="px-2 font-normal">Easy</th><th className="px-2 font-normal">Medium</th><th className="px-2 font-normal">Hard</th></tr>
          </thead>
          <tbody>
            {Object.entries(coverage).map(([key, c]) => (
              <tr key={key} className={cn("border-t border-line transition-colors hover:bg-page", key === category && "bg-arena-50")}>
                <td className="px-4 py-1.5">{c.label}</td>
                {["easy", "medium", "hard"].map((d) => <td key={d} className={cn("px-2", c[d] < 3 && "text-danger-600")}>{c[d]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <ErrorLine error={error} />
        <button type="button" onClick={() => setEditing("new")} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-arena-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"><Plus size={15} aria-hidden="true" /> New question</button>
      </div>

      <ul className="space-y-2">
        {items.map((q, i) => (
          <motion.li key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className={cn("rounded-card border border-line bg-panel p-4 transition-colors hover:border-arena-300", !q.isActive && "opacity-70")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="arena">{q.categoryLabel}</Pill>
                  <Pill tone={DIFF_TONE[q.difficulty]}>{q.difficulty}</Pill>
                  {q.topic && <Pill>{q.topic}</Pill>}
                  {!q.isActive && <Pill>Inactive</Pill>}
                  {q.openReports > 0 && <Pill tone="danger"><Flag size={11} aria-hidden="true" /> {q.openReports}</Pill>}
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm">{q.prompt}</p>
                <ol className="mt-1.5 grid grid-cols-[minmax(0,1fr)] gap-1 text-xs sm:grid-cols-2">
                  {q.options.map((o, j) => (
                    <li key={j} className={cn("rounded-lg px-2 py-1", j === q.answer ? "bg-bridge-50 text-bridge-800" : "bg-page text-muted")}>
                      {String.fromCharCode(65 + j)}. {o}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => toggle(q)} disabled={busy === `${q.id}:toggle`} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-arena-300">
                  {busy === `${q.id}:toggle` ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : q.isActive ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => setEditing(q)} aria-label="Edit question" className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><Pencil size={15} /></button>
                {confirm === q.id ? (
                  <span className="inline-flex items-center gap-1">
                    <button type="button" onClick={async () => { await run(`/api/admin/questions/${q.id}`, null, { method: "DELETE", key: `${q.id}:del` }); setConfirm(null); }} className="rounded-full bg-danger-600 px-3 py-1.5 text-sm text-white">Delete</button>
                    <button type="button" onClick={() => setConfirm(null)} className="px-2 text-sm text-muted">Cancel</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirm(q.id)} aria-label="Delete question" className="rounded-full p-2 text-muted hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
      {!items.length && <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No questions match these filters.</p>}

      <AnimatePresence>
        {current && <Editor key={current === "new" ? "new" : current.id} question={current === "new" ? null : current} defaultCategory={category} onClose={close} />}
      </AnimatePresence>
    </div>
  );
}
