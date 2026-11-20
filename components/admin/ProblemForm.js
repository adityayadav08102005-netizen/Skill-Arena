"use client";

import { AnimatePresence, motion } from "motion/react";
import { EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const input = "w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none transition-colors focus:border-arena-400";
const mono = `${input} font-mono text-xs`;
const blankTest = () => ({ input: "", output: "", explanation: "" });
const toList = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 80);
const XP = { easy: 10, medium: 30, hard: 50 };

function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {children}
      {error && <span className="block text-xs text-danger-600">{error}</span>}
    </label>
  );
}

function Tests({ label, hint, tests, onChange, hidden, error }) {
  const set = (i, key, value) => onChange(tests.map((t, j) => (j === i ? { ...t, [key]: value } : t)));
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-1.5 text-sm font-medium">{hidden && <EyeOff size={14} className="text-muted" aria-hidden="true" />} {label}</legend>
      <p className="text-xs text-muted">{hint}</p>
      <AnimatePresence initial={false}>
        {tests.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-line bg-page p-2 sm:grid-cols-2">
              <textarea aria-label={`${label} ${i + 1} input`} value={t.input} onChange={(e) => set(i, "input", e.target.value)} rows={3} placeholder="stdin" className={mono} />
              <textarea aria-label={`${label} ${i + 1} expected output`} value={t.output} onChange={(e) => set(i, "output", e.target.value)} rows={3} placeholder="expected stdout" className={mono} />
              {!hidden && <input aria-label={`${label} ${i + 1} explanation`} value={t.explanation} onChange={(e) => set(i, "explanation", e.target.value)} placeholder="Explanation (optional)" className={`${input} sm:col-span-2`} />}
              <button type="button" onClick={() => onChange(tests.filter((_, j) => j !== i))} disabled={tests.length === 1} className="inline-flex items-center gap-1 justify-self-start text-xs text-muted hover:text-danger-600 disabled:opacity-40">
                <Trash2 size={12} aria-hidden="true" /> Remove test {i + 1}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button type="button" onClick={() => onChange([...tests, blankTest()])} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted hover:border-arena-300 hover:text-ink">
        <Plus size={13} aria-hidden="true" /> Add test
      </button>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </fieldset>
  );
}

/** Create or edit a problem, including hidden tests. Every test is stdin → stdout. */
export default function ProblemForm({ problem }) {
  const router = useRouter();
  const [f, setF] = useState(() => ({
    title: problem?.title ?? "",
    slug: problem?.slug ?? "",
    difficulty: problem?.difficulty ?? "easy",
    description: problem?.description ?? "",
    inputFormat: problem?.inputFormat ?? "",
    outputFormat: problem?.outputFormat ?? "",
    constraints: problem?.constraints ?? "",
    topics: (problem?.topics ?? []).join(", "),
    concepts: (problem?.concepts ?? []).join(", "),
    hints: problem?.hints?.length ? problem.hints : [""],
    samples: problem?.samples?.length ? problem.samples.map((t) => ({ ...blankTest(), ...t })) : [blankTest()],
    hiddenTests: problem?.hiddenTests?.length ? problem.hiddenTests.map((t) => ({ ...blankTest(), ...t })) : [blankTest()],
    timeComplexity: problem?.timeComplexity ?? "",
    spaceComplexity: problem?.spaceComplexity ?? "",
    xpReward: problem?.xpReward ?? XP.easy,
    isInterview: problem?.isInterview ?? false,
    isPublished: problem?.isPublished ?? false,
  }));
  const [slugTouched, setSlugTouched] = useState(Boolean(problem));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage("");
    const body = {
      ...f,
      topics: toList(f.topics),
      concepts: toList(f.concepts),
      hints: f.hints.map((h) => h.trim()).filter(Boolean),
      samples: f.samples.map((t) => ({ input: t.input, output: t.output, explanation: t.explanation ?? "" })),
      hiddenTests: f.hiddenTests.map((t) => ({ input: t.input, output: t.output, explanation: "" })),
      xpReward: Number(f.xpReward),
    };
    const res = await fetch(problem ? `/api/admin/problems/${problem.id}` : "/api/admin/problems", {
      method: problem ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) {
      const byField = {};
      for (const d of data?.details ?? []) byField[d.path.split(".")[0]] ??= d.message;
      setErrors(byField);
      setMessage(data?.error || "Couldn't save the problem.");
      return;
    }
    if (!problem) router.push(`/admin/problems/${data.id}`);
    else {
      setMessage("Saved.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <section className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-card border border-line bg-panel p-4 sm:grid-cols-2">
        <Field label="Title" error={errors.title}>
          <input value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value, slug: slugTouched ? s.slug : slugify(e.target.value) }))} maxLength={140} className={input} required />
        </Field>
        <Field label="Slug" hint="Used in the URL: /algoarena/your-slug" error={errors.slug}>
          <input value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug")(e); }} maxLength={80} className={`${input} font-mono`} required />
        </Field>
        <Field label="Difficulty" error={errors.difficulty}>
          <select value={f.difficulty} onChange={(e) => setF((s) => ({ ...s, difficulty: e.target.value, xpReward: problem ? s.xpReward : XP[e.target.value] }))} className={input}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>
        <Field label="XP reward" hint="Awarded once, on the first accepted solution" error={errors.xpReward}>
          <input type="number" min={0} max={200} value={f.xpReward} onChange={set("xpReward")} className={input} />
        </Field>
        <Field label="Topics" hint="Comma-separated, e.g. Arrays, Hashing" error={errors.topics}>
          <input value={f.topics} onChange={set("topics")} className={input} />
        </Field>
        <Field label="Concepts" hint="Comma-separated (optional)" error={errors.concepts}>
          <input value={f.concepts} onChange={set("concepts")} className={input} />
        </Field>
        <Field label="Description" error={errors.description} className="sm:col-span-2">
          <textarea value={f.description} onChange={set("description")} rows={8} className={input} />
        </Field>
        <Field label="Input format" error={errors.inputFormat}>
          <textarea value={f.inputFormat} onChange={set("inputFormat")} rows={3} className={input} />
        </Field>
        <Field label="Output format" error={errors.outputFormat}>
          <textarea value={f.outputFormat} onChange={set("outputFormat")} rows={3} className={input} />
        </Field>
        <Field label="Constraints" error={errors.constraints}>
          <textarea value={f.constraints} onChange={set("constraints")} rows={3} className={input} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time complexity" error={errors.timeComplexity}><input value={f.timeComplexity} onChange={set("timeComplexity")} placeholder="O(n)" className={input} /></Field>
          <Field label="Space complexity" error={errors.spaceComplexity}><input value={f.spaceComplexity} onChange={set("spaceComplexity")} placeholder="O(1)" className={input} /></Field>
        </div>
      </section>

      <section className="space-y-5 rounded-card border border-line bg-panel p-4">
        <Tests label="Sample tests" hint="Shown to students and used by Run." tests={f.samples} onChange={set("samples")} error={errors.samples} />
        <Tests label="Hidden tests" hint="Never sent to the browser. Submit is judged on samples plus these." tests={f.hiddenTests} onChange={set("hiddenTests")} hidden error={errors.hiddenTests} />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Hints</legend>
          {f.hints.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label={`Hint ${i + 1}`} value={h} onChange={(e) => setF((s) => ({ ...s, hints: s.hints.map((x, j) => (j === i ? e.target.value : x)) }))} className={input} placeholder={`Hint ${i + 1}`} />
              <button type="button" aria-label={`Remove hint ${i + 1}`} onClick={() => setF((s) => ({ ...s, hints: s.hints.filter((_, j) => j !== i) }))} className="rounded-full p-2 text-muted hover:text-danger-600"><Trash2 size={14} /></button>
            </div>
          ))}
          {f.hints.length < 5 && <button type="button" onClick={() => setF((s) => ({ ...s, hints: [...s.hints, ""] }))} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Plus size={13} aria-hidden="true" /> Add hint</button>}
          {errors.hints && <p className="text-xs text-danger-600">{errors.hints}</p>}
        </fieldset>
      </section>

      <div className="sticky bottom-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-panel/95 p-3 shadow-float backdrop-blur">
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.isInterview} onChange={set("isInterview")} className="accent-arena-600" /> Interview question</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.isPublished} onChange={set("isPublished")} className="accent-arena-600" /> Published</label>
        </div>
        <div className="flex items-center gap-3">
          {message && <span role="status" className={cn("text-sm", Object.keys(errors).length || message !== "Saved." ? "text-danger-600" : "text-bridge-600")}>{message}</span>}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-arena-600 px-5 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} {problem ? "Save changes" : "Create problem"}
          </button>
        </div>
      </div>
    </form>
  );
}
