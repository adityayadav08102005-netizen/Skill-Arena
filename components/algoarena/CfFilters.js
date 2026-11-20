"use client";

import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { useRef } from "react";

const RATINGS = Array.from({ length: 28 }, (_, i) => 800 + i * 100);
const SORTS = [["solved", "Most solved"], ["newest", "Newest"], ["easiest", "Easiest first"], ["hardest", "Hardest first"]];
const field = "h-9 rounded-full bg-page px-3 text-sm outline-none transition-shadow focus:ring-4 focus:ring-arena-50";

/** Search and filters for the Codeforces list. A GET form, so filters live in the URL. */
export default function CfFilters({ filters, tags }) {
  const form = useRef(null);
  const submit = () => form.current?.requestSubmit();
  const active = filters.q || filters.min || filters.max || filters.tag || filters.sort !== "solved";

  return (
    <Form
      ref={form}
      action="/algoarena/codeforces"
      className="sticky top-16 z-30 flex flex-wrap items-center gap-1.5 rounded-[20px] border border-line bg-panel/95 p-1.5 shadow-float backdrop-blur-md"
    >
      <label className="relative min-w-48 flex-1">
        <span className="sr-only">Search problem names or codes</span>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input name="q" defaultValue={filters.q} placeholder="Search names, or a code like 1985A" className={`${field} w-full pl-9`} />
      </label>
      <label className="flex items-center gap-1 text-sm text-muted">
        <span className="pl-1">Rating</span>
        <select name="min" defaultValue={filters.min ?? ""} onChange={submit} aria-label="Minimum rating" className={field}>
          <option value="">Any</option>
          {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span aria-hidden="true">–</span>
        <select name="max" defaultValue={filters.max ?? ""} onChange={submit} aria-label="Maximum rating" className={field}>
          <option value="">Any</option>
          {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <select name="tag" defaultValue={filters.tag} onChange={submit} aria-label="Tag" className={`${field} max-w-44`}>
        <option value="">All tags</option>
        {tags.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select name="sort" defaultValue={filters.sort} onChange={submit} aria-label="Sort" className={field}>
        {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {active && (
        <Link href="/algoarena/codeforces" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-muted transition-colors hover:bg-page hover:text-ink">
          <X size={14} aria-hidden="true" /> Clear
        </Link>
      )}
      <button type="submit" className="sr-only">Search</button>
    </Form>
  );
}
