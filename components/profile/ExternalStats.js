"use client";

import { motion } from "motion/react";
import { ExternalLink, GitFork, Loader2, RefreshCw, Star, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { codeforcesRankColor } from "@/lib/api/profiles/map";
import { cn } from "@/lib/utils/cn";
import TimeAgo from "@/components/common/TimeAgo";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Shell({ title, href, linkLabel, children, footer, delay = 0 }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay }} className="flex flex-col rounded-card border border-line bg-panel p-5 transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1 hover:border-arena-300">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">{linkLabel} <ExternalLink size={12} aria-hidden="true" /></a>
      </header>
      <div className="flex-1">{children}</div>
      {footer && <p className="mt-3 text-[11px] text-muted">{footer}</p>}
    </motion.section>
  );
}

function Unavailable({ entry, label }) {
  if (entry.status === "not_found") return <p className="text-sm text-muted">No {label} account called &ldquo;{entry.handle}&rdquo;. Check the username on the profile.</p>;
  if (entry.status === "pending") return <p className="text-sm text-muted">{label} stats are on their way. Check back in a minute.</p>;
  return <p className="text-sm text-muted">{label} isn&apos;t responding right now, so there are no stats to show yet.</p>;
}

const footerFor = (entry, label) =>
  entry.fetchedAt ? (
    <>
      From {label} · updated <TimeAgo date={entry.fetchedAt} />
      {entry.status === "error" ? " · couldn't refresh, showing the last copy" : ""}
    </>
  ) : null;

function GithubCard({ entry, delay }) {
  const d = entry.data;
  const totalLangRepos = d?.topLanguages.reduce((s, l) => s + l.repos, 0) ?? 0;
  return (
    <Shell title="GitHub" href={`https://github.com/${entry.handle}`} linkLabel={`@${entry.handle}`} footer={footerFor(entry, "GitHub")} delay={delay}>
      {!d ? (
        <Unavailable entry={entry} label="GitHub" />
      ) : (
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[["Repositories", d.publicRepos], ["Stars", d.totalStars], ["Followers", d.followers]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-page px-2 py-1.5">
                <dt className="text-[11px] text-muted">{label}</dt>
                <dd className="font-medium">{value.toLocaleString("en-IN")}</dd>
              </div>
            ))}
          </dl>
          {d.topLanguages.length > 0 && (
            <div>
              <div className="flex h-2 overflow-hidden rounded-full bg-page" role="img" aria-label={`Languages: ${d.topLanguages.map((l) => `${l.name} ${l.repos}`).join(", ")}`}>
                {d.topLanguages.map((l, i) => (
                  <motion.span key={l.name} initial={{ width: 0 }} whileInView={{ width: `${(l.repos / totalLangRepos) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 * i }} className="h-full border-r-2 border-panel last:border-r-0" style={{ background: `var(--sa-arena-${[800, 600, 400, 300, 200][i]})` }} />
                ))}
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                {d.topLanguages.map((l, i) => (
                  <li key={l.name} className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm" style={{ background: `var(--sa-arena-${[800, 600, 400, 300, 200][i]})` }} aria-hidden="true" />
                    {l.name} <span className="opacity-70">{l.repos}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d.featured.length > 0 && (
            <ul className="space-y-1.5">
              {d.featured.map((r) => (
                <li key={r.name}>
                  <a href={r.url ?? `https://github.com/${entry.handle}`} target="_blank" rel="noopener noreferrer nofollow" className="block rounded-lg border border-line px-3 py-2 transition-[padding,border-color] duration-200 hover:border-arena-300 hover:pl-4">
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{r.name}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                        {r.language && <span>{r.language}</span>}
                        <span className="inline-flex items-center gap-0.5"><Star size={11} aria-hidden="true" />{r.stars.toLocaleString("en-IN")}</span>
                        <span className="inline-flex items-center gap-0.5"><GitFork size={11} aria-hidden="true" />{r.forks.toLocaleString("en-IN")}</span>
                      </span>
                    </span>
                    {r.description && <span className="mt-0.5 block truncate text-xs text-muted">{r.description}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Shell>
  );
}

function RatingTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload;
  return (
    <div className="max-w-56 rounded-xl border border-line bg-panel px-3 py-2 text-xs shadow-float">
      <div className="truncate text-muted">{c.name}</div>
      <div className="mt-0.5 font-medium text-ink">Rating {c.newRating} ({c.newRating - c.oldRating >= 0 ? "+" : ""}{c.newRating - c.oldRating})</div>
      <div className="text-muted">Rank #{c.rank}{c.at ? ` · ${fmtDate(c.at)}` : ""}</div>
    </div>
  );
}

function CodeforcesCard({ entry, delay }) {
  const d = entry.data;
  return (
    <Shell title="Codeforces" href={`https://codeforces.com/profile/${entry.handle}`} linkLabel={entry.handle} footer={footerFor(entry, "Codeforces")} delay={delay}>
      {!d ? (
        <Unavailable entry={entry} label="Codeforces" />
      ) : (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-medium tabular-nums">{d.rating ?? "–"}</div>
              <div className="inline-flex items-center gap-1.5 text-xs capitalize text-muted">
                <span className="size-2 rounded-full" style={{ background: codeforcesRankColor(d.rank) }} aria-hidden="true" /> {d.rank}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><dt className="text-muted">Max</dt><dd className="font-medium">{d.maxRating ?? "–"}</dd></div>
              <div><dt className="text-muted">Contests</dt><dd className="font-medium">{d.contestCount}</dd></div>
              <div><dt className="text-muted">Best rank</dt><dd className="inline-flex items-center gap-0.5 font-medium">{d.bestRank ? <><Trophy size={11} className="text-xp-600" aria-hidden="true" />{d.bestRank}</> : "–"}</dd></div>
            </dl>
          </div>
          {d.recent.length > 1 ? (
            <div className="h-24" role="img" aria-label={`Rating over the last ${d.recent.length} rated contests, from ${d.recent[0].newRating} to ${d.recent.at(-1).newRating}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.recent} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
                  <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
                  <Tooltip content={<RatingTooltip />} cursor={{ stroke: "var(--sa-arena-300)", strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="newRating" stroke="var(--sa-arena-600)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "var(--sa-panel)", strokeWidth: 2, fill: "var(--sa-arena-600)" }} animationDuration={1000} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted">{d.contestCount ? "One rated contest so far." : "No rated contests yet."}</p>
          )}
        </div>
      )}
    </Shell>
  );
}

/** GitHub and Codeforces cards from the cached summaries. Owners get a refresh button. */
export default function ExternalStats({ stats, owner = false, className }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const entries = [stats.github && ["github", stats.github], stats.codeforces && ["codeforces", stats.codeforces]].filter(Boolean);
  if (!entries.length) return null;

  async function refresh() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/profile/external", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setMessage(data?.error || "Couldn't refresh right now.");
    router.refresh();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4", entries.length > 1 && "md:grid-cols-2")}>
        {entries.map(([key, entry], i) => (key === "github" ? <GithubCard key={key} entry={entry} delay={i * 0.05} /> : <CodeforcesCard key={key} entry={entry} delay={i * 0.05} />))}
      </div>
      {owner && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted">
          {message && <span role="status">{message}</span>}
          <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-page hover:text-ink disabled:opacity-60">
            {busy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={12} aria-hidden="true" />} Refresh stats
          </button>
        </div>
      )}
    </div>
  );
}
