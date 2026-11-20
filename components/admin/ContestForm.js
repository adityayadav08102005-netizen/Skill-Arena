"use client";

import { Reorder } from "motion/react";
import { GripVertical, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const input = "w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none transition-colors focus:border-arena-400 disabled:bg-page disabled:text-muted";
const POINTS = { easy: 100, medium: 200, hard: 300 };
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 80);

/** datetime-local value in the browser's zone, and back to an ISO instant. */
const toLocal = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocal = (v) => (v ? new Date(v).toISOString() : "");

/** Create or edit a contest. After it starts, schedule, problems and scoring are locked (the server enforces this too). */
export default function ContestForm({ contest, problemOptions }) {
  const router = useRouter();
  const locked = Boolean(contest && contest.state !== "upcoming");
  const ended = contest?.state === "ended";
  const byId = new Map(problemOptions.map((p) => [p.id, p]));
  const [f, setF] = useState(() => ({
    title: contest?.title ?? "",
    slug: contest?.slug ?? "",
    description: contest?.description ?? "",
    startsAt: toLocal(contest?.startsAt),
    endsAt: toLocal(contest?.endsAt),
    penaltyMinutesPerWrong: contest?.penaltyMinutesPerWrong ?? 10,
    problems: (contest?.problems ?? []).map((p) => ({ ...p, key: p.problemId })),
    isPublished: contest?.isPublished ?? false,
  }));
  const [slugTouched, setSlugTouched] = useState(Boolean(contest));
  const [pick, setPick] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const chosen = new Set(f.problems.map((p) => p.problemId));

  const add = () => {
    const p = byId.get(pick);
    if (!p || chosen.has(p.id)) return;
    setF((s) => ({ ...s, problems: [...s.problems, { problemId: p.id, points: POINTS[p.difficulty], key: p.id }] }));
    setPick("");
  };

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage("");
    const body = {
      title: f.title,
      slug: f.slug,
      description: f.description,
      startsAt: fromLocal(f.startsAt),
      endsAt: fromLocal(f.endsAt),
      penaltyMinutesPerWrong: Number(f.penaltyMinutesPerWrong),
      problems: f.problems.map((p) => ({ problemId: p.problemId, points: Number(p.points) })),
      isPublished: f.isPublished,
    };
    const res = await fetch(contest ? `/api/admin/contests/${contest.id}` : "/api/admin/contests", { method: contest ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) {
      const byField = {};
      for (const d of data?.details ?? []) byField[d.path.split(".")[0]] ??= d.message;
      setErrors(byField);
      setMessage(data?.error || "Couldn't save the contest.");
      return;
    }
    if (!contest) router.push(`/admin/contests/${data.id}`);
    else {
      setMessage("Saved.");
      router.refresh();
    }
  }

  const err = (k) => errors[k] && <span className="block text-xs text-danger-600">{errors[k]}</span>;
  const total = f.problems.reduce((s, p) => s + Number(p.points || 0), 0);

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      {locked && (
        <p className="inline-flex items-center gap-1.5 rounded-xl bg-xp-50 px-3 py-2 text-sm text-xp-800">
          <Lock size={14} aria-hidden="true" /> This contest has {ended ? "ended" : "started"}: the schedule, problems and scoring are locked{ended ? "" : ". You can still extend the end time"}.
        </p>
      )}
      <section className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-card border border-line bg-panel p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Title</span>
          <input value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value, slug: slugTouched ? s.slug : slugify(e.target.value) }))} maxLength={140} className={input} />
          {err("title")}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Slug</span>
          <input value={f.slug} onChange={(e) => { setSlugTouched(true); setF((s) => ({ ...s, slug: e.target.value })); }} disabled={locked} maxLength={80} className={`${input} font-mono`} />
          {err("slug")}
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">Description</span>
          <textarea value={f.description} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} rows={3} maxLength={4000} className={input} />
          {err("description")}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Starts</span>
          <input type="datetime-local" value={f.startsAt} onChange={(e) => setF((s) => ({ ...s, startsAt: e.target.value }))} disabled={locked} className={input} />
          {err("startsAt")}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Ends</span>
          <input type="datetime-local" value={f.endsAt} onChange={(e) => setF((s) => ({ ...s, endsAt: e.target.value }))} disabled={ended} className={input} />
          {err("endsAt")}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Penalty per wrong submission (minutes)</span>
          <input type="number" min={0} max={60} value={f.penaltyMinutesPerWrong} onChange={(e) => setF((s) => ({ ...s, penaltyMinutesPerWrong: e.target.value }))} disabled={locked} className={input} />
          {err("penaltyMinutesPerWrong")}
        </label>
        <p className="self-end text-xs text-muted">Times are in your browser&apos;s time zone. Ranking: points first, then fewer penalty minutes.</p>
      </section>

      <section className="space-y-3 rounded-card border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Problems <span className="font-normal text-muted">· {total} points in total{locked ? "" : " · drag to reorder"}</span></h2>
          {!locked && (
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="pick-problem">Add a problem</label>
              <select id="pick-problem" value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 max-w-72 rounded-full border border-line bg-panel px-3 text-sm">
                <option value="">Choose a problem…</option>
                {problemOptions.filter((p) => !chosen.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.title} · {p.difficulty}{p.isPublished ? "" : " · draft"}</option>)}
              </select>
              <button type="button" onClick={add} disabled={!pick} className="inline-flex items-center gap-1 rounded-full border border-line px-3 text-sm hover:border-arena-300 disabled:opacity-50"><Plus size={13} aria-hidden="true" /> Add</button>
            </div>
          )}
        </div>
        <Reorder.Group axis="y" values={f.problems} onReorder={(problems) => !locked && setF((s) => ({ ...s, problems }))} className="space-y-2">
          {f.problems.map((p, i) => {
            const info = byId.get(p.problemId);
            return (
              <Reorder.Item key={p.key} value={p} dragListener={!locked} className={cn("flex items-center gap-3 rounded-xl border border-line bg-page px-3 py-2", !locked && "cursor-grab active:cursor-grabbing")}>
                {!locked && <GripVertical size={15} className="text-muted" aria-hidden="true" />}
                <span className="flex size-6 items-center justify-center rounded-full bg-arena-50 text-xs text-arena-800">{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{info?.title ?? "Removed problem"} <span className="text-xs text-muted">· {info?.difficulty}{info && !info.isPublished ? " · draft (revealed at start)" : ""}</span></span>
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input type="number" min={1} max={5000} value={p.points} onChange={(e) => setF((s) => ({ ...s, problems: s.problems.map((x) => (x.key === p.key ? { ...x, points: e.target.value } : x)) }))} disabled={locked} aria-label={`Points for problem ${i + 1}`} className="w-20 rounded-lg border border-line bg-panel px-2 py-1 text-sm text-ink disabled:bg-page" /> pts
                </label>
                {!locked && <button type="button" onClick={() => setF((s) => ({ ...s, problems: s.problems.filter((x) => x.key !== p.key) }))} aria-label={`Remove problem ${i + 1}`} className="rounded-full p-1.5 text-muted hover:text-danger-600"><Trash2 size={14} /></button>}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
        {!f.problems.length && <p className="rounded-xl bg-page px-4 py-5 text-center text-sm text-muted">Add problems from the library. Drafts work too: students only see them once the contest starts.</p>}
        {err("problems")}
      </section>

      <div className="sticky bottom-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-panel/95 p-3 shadow-float backdrop-blur">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPublished} onChange={(e) => setF((s) => ({ ...s, isPublished: e.target.checked }))} disabled={locked} className="accent-arena-600" /> Published (students can see and register)</label>
        <div className="flex items-center gap-3">
          {message && <span role="status" className={cn("text-sm", message === "Saved." ? "text-bridge-600" : "text-danger-600")}>{message}</span>}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-arena-600 px-5 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} {contest ? "Save changes" : "Create contest"}
          </button>
        </div>
      </div>
    </form>
  );
}
