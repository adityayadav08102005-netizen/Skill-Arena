"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import SlidingTabs from "@/components/common/SlidingTabs";
import { EXPERIENCE_LEVELS, OPPORTUNITY_TYPES, WORK_MODES } from "@/data/opportunities";
import { cn } from "@/lib/utils/cn";
import { SOURCE_LABEL } from "@/lib/utils/format";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-1 text-sm transition-all duration-200 hover:-translate-y-0.5",
        active ? "bg-bridge-50 text-bridge-800" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Floating filter bar. Every filter lives in the URL (shareable, back button
 * works) and the server renders the matching listings.
 */
export default function FilterBar({ filters, counts, signedInStudent }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [location, setLocation] = useState(filters.location);
  const first = useRef(true);

  const update = (changes) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      const value = Array.isArray(v) ? v.join(",") : v;
      if (value) next.set(k, value);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Debounced text filters.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q, location }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed values should trigger this
  }, [q, location]);

  const toggle = (key, value) => {
    const list = filters[key];
    update({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });
  };

  const active = filters.q || filters.type.length || filters.mode.length || filters.experience || filters.location || filters.source;

  return (
    <div className="space-y-3">
      {signedInStudent && (
        <div className="overflow-x-auto pb-1">
          <SlidingTabs
            ariaLabel="Opportunity lists"
            value={filters.tab}
            onChange={(tab) => update({ tab: tab === "all" ? "" : tab })}
            tabs={[
              { value: "all", label: "All" },
              { value: "foryou", label: `For you · ${counts?.foryou ?? 0}` },
              { value: "saved", label: `Saved · ${counts?.saved ?? 0}` },
              { value: "applied", label: `Applied · ${counts?.applied ?? 0}` },
            ]}
          />
        </div>
      )}

      <div className="sticky top-16 z-30 space-y-1.5 rounded-[20px] border border-line bg-panel/95 p-2 shadow-float backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-52 flex-1">
            <span className="sr-only">Search title, company or skill</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, company or skill"
              className="h-9 w-full rounded-full bg-page pl-9 pr-3 text-sm outline-none transition-shadow focus:ring-4 focus:ring-bridge-50"
            />
          </label>
          <label className="sr-only" htmlFor="loc">Location</label>
          <input
            id="loc"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="h-9 w-36 rounded-full bg-page px-3 text-sm outline-none focus:ring-4 focus:ring-bridge-50"
          />
          <label className="sr-only" htmlFor="exp">Experience</label>
          <select id="exp" value={filters.experience} onChange={(e) => update({ experience: e.target.value })} className="h-9 rounded-full bg-page px-3 text-sm outline-none">
            <option value="">Any experience</option>
            {EXPERIENCE_LEVELS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="src">Source</label>
          <select id="src" value={filters.source} onChange={(e) => update({ source: e.target.value })} className="h-9 rounded-full bg-page px-3 text-sm outline-none">
            <option value="">All sources</option>
            <option value="manual">Posted on SkillArena</option>
            {Object.entries(SOURCE_LABEL).filter(([k]) => k !== "manual").map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <label className="sr-only" htmlFor="sort">Sort</label>
          <select id="sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value === "match" ? "" : e.target.value })} className="h-9 rounded-full bg-page px-3 text-sm outline-none">
            {signedInStudent && <option value="match">Best match</option>}
            <option value="latest">Latest</option>
            <option value="deadline">Closing soon</option>
          </select>
          {pending && <Loader2 size={16} className="animate-spin text-bridge-600" aria-label="Updating" />}
        </div>
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
          <div role="group" aria-label="Opportunity type" className="flex flex-wrap">
            {OPPORTUNITY_TYPES.map((t) => <Chip key={t.key} active={filters.type.includes(t.key)} onClick={() => toggle("type", t.key)}>{t.label}</Chip>)}
          </div>
          <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
          <div role="group" aria-label="Work mode" className="flex">
            {WORK_MODES.map((m) => <Chip key={m.key} active={filters.mode.includes(m.key)} onClick={() => toggle("mode", m.key)}>{m.label}</Chip>)}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setLocation("");
                update({ q: "", type: [], mode: [], experience: "", location: "", source: "" });
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted hover:text-danger-600"
            >
              <X size={12} aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
