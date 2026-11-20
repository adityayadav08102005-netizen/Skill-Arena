"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ASSESSMENT_CATEGORIES } from "@/data/assessments";
import { cn } from "@/lib/utils/cn";

/** Floating search/filter bar for recruiters. Everything lives in the URL; the server runs the search. */
export default function StudentSearch({ filters, skillOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const listId = useId();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [skillDraft, setSkillDraft] = useState("");
  const first = useRef(true);

  const update = (changes) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, val] of Object.entries(changes)) {
      const value = Array.isArray(val) ? val.join(",") : String(val ?? "");
      if (value && value !== "0") next.set(k, value);
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

  const addSkill = (e) => {
    e?.preventDefault();
    const name = skillDraft.trim();
    setSkillDraft("");
    if (!name || filters.skills.some((s) => s.toLowerCase() === name.toLowerCase())) return;
    update({ skills: [...filters.skills, skillOptions.find((o) => o.toLowerCase() === name.toLowerCase()) ?? name] });
  };

  const select = (key, options, value, label) => (
    <>
      <label className="sr-only" htmlFor={`f-${key}`}>{label}</label>
      <select id={`f-${key}`} value={value} onChange={(e) => update({ [key]: e.target.value })} className="h-9 rounded-full bg-page px-3 text-sm outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </>
  );

  const any = filters.q || filters.skills.length || filters.verified || filters.minLevel || filters.minSolved || filters.category || filters.gradYear;
  const year = new Date().getFullYear();

  return (
    <div className="sticky top-16 z-30 space-y-2 rounded-[20px] border border-line bg-panel/95 p-2 shadow-float backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Search by name, college or role</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, college or preferred role" className="h-9 w-full rounded-full bg-page pl-9 pr-3 text-sm outline-none focus:ring-4 focus:ring-bridge-50" />
        </label>
        <form onSubmit={addSkill} className="flex items-center">
          <label className="sr-only" htmlFor={`${listId}-skill`}>Add a skill filter</label>
          <input id={`${listId}-skill`} list={listId} value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} placeholder="+ Skill" className="h-9 w-32 rounded-full bg-page px-3 text-sm outline-none focus:ring-4 focus:ring-bridge-50" />
          <datalist id={listId}>{skillOptions.map((o) => <option key={o} value={o} />)}</datalist>
        </form>
        {select("minLevel", [["0", "Any level"], ["3", "Level 3+"], ["5", "Level 5+"], ["10", "Level 10+"]], String(filters.minLevel || 0), "Minimum level")}
        {select("minSolved", [["0", "Any solved"], ["5", "5+ solved"], ["10", "10+ solved"], ["25", "25+ solved"]], String(filters.minSolved || 0), "Minimum problems solved")}
        {select("gradYear", [["0", "Any batch"], ...Array.from({ length: 5 }, (_, i) => [String(year - 1 + i), `Batch ${year - 1 + i}`])], String(filters.gradYear || 0), "Graduation year")}
        {pending && <Loader2 size={16} className="animate-spin text-bridge-600" aria-label="Searching" />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.skills.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-bridge-50 px-2.5 py-1 text-xs text-bridge-800">
            {s}
            <button type="button" onClick={() => update({ skills: filters.skills.filter((x) => x !== s) })} aria-label={`Remove ${s}`}><X size={12} /></button>
          </span>
        ))}
        {filters.skills.length > 0 && (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={filters.verified} onChange={(e) => update({ verified: e.target.checked ? "1" : "" })} className="accent-[var(--sa-bridge-600)]" /> Verified by assessment only
          </label>
        )}
        {select("category", [["", "Any assessment"], ...ASSESSMENT_CATEGORIES.map((c) => [c.key, c.label])], filters.category, "Assessment category")}
        {filters.category && select("minScore", [["0", "Any score"], ["60", "60%+"], ["75", "75%+"], ["90", "90%+"]], String(filters.minScore || 0), "Minimum assessment score")}
        {select("sort", [["xp", "Sort: XP"], ["solved", "Sort: problems solved"], ["assessment", "Sort: best assessment"], ["recent", "Sort: recently active"]], filters.sort, "Sort")}
        {any && (
          <button type="button" onClick={() => { setQ(""); update({ q: "", skills: [], verified: "", minLevel: "", minSolved: "", category: "", minScore: "", gradYear: "" }); }} className={cn("ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted hover:text-danger-600")}>
            <X size={12} aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
