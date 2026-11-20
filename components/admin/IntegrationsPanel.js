"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, RefreshCw } from "lucide-react";
import { APP_TIMEZONE } from "@/lib/utils/time";
import { ActionButton, ErrorLine, Pill, useAdminAction } from "./shared";
import TimeAgo from "@/components/common/TimeAgo";

const fmt = (d) => new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Status({ ok, warn, children }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : CircleDashed;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok ? "text-bridge-800" : warn ? "text-danger-600" : "text-muted"}`}>
      <Icon size={13} aria-hidden="true" /> {children}
    </span>
  );
}

function Card({ title, sub, status, children, delay = 0 }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4 transition-[translate,border-color] duration-300 hover:-translate-y-0.5 hover:border-arena-300">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">{title}</h2>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
        {status}
      </header>
      {children}
    </motion.section>
  );
}

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-page px-2.5 py-1.5">
    <div className="text-[11px] text-muted">{label}</div>
    <div className="text-sm font-medium">{value}</div>
  </div>
);

/** Status of every external service, with "Sync now" for the job boards. */
export default function IntegrationsPanel({ data }) {
  const { run, busy, error } = useAdminAction();
  const { runner, github, codeforces } = data;
  return (
    <div className="space-y-3">
      <ErrorLine error={error} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
        {data.boards.map((b, i) => {
          const due = !b.nextAt;
          return (
            <Card
              key={b.key}
              delay={i * 0.05}
              title={<a href={b.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-arena-800">{b.label} <ExternalLink size={13} aria-hidden="true" /></a>}
              sub={`Job board import · at most every ${b.intervalHours < 1 ? `${b.intervalHours * 60} minutes` : `${b.intervalHours} hours`}; automatic every ${b.autoHours} hours`}
              status={!b.configured ? <Status>Not configured</Status> : b.running ? <Status>Running…</Status> : b.lastError ? <Status warn>Last run failed</Status> : b.lastSuccessAt ? <Status ok>Working</Status> : <Status>Never run</Status>}
            >
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Live listings" value={b.live} />
                <Stat label="Closed (gone from board)" value={b.closed} />
                <Stat label="Taken down by admins" value={b.takenDown} />
              </div>
              {b.lastStats && b.lastSuccessAt && (
                <p className="text-xs text-muted">
                  Last import <TimeAgo date={b.lastSuccessAt} />: {b.lastStats.fetched} fetched, {b.lastStats.kept} kept, {b.lastStats.created} new, {b.lastStats.updated} updated, {b.lastStats.closed} closed.
                </p>
              )}
              {b.lastError && <p className="rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-800">{b.lastError} {b.lastRunAt && <>(<TimeAgo date={b.lastRunAt} />)</>} The listings already imported stay up.</p>}
              {!b.configured && <p className="text-xs text-muted">Needs a free API key: set ADZUNA_APP_ID and ADZUNA_APP_KEY in Vercel, then redeploy.</p>}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <ActionButton tone="arena" busy={busy === b.key} disabled={!b.configured || !due || b.running} onClick={() => run(`/api/admin/integrations/${b.key}/sync`, {}, { key: b.key })}>
                  <RefreshCw size={13} aria-hidden="true" /> Sync now
                </ActionButton>
                {!due && <span className="text-xs text-muted">Next sync allowed {fmt(b.nextAt)}{b.key === "remotive" ? " (Remotive asks for a few requests a day at most)" : ""}</span>}
              </div>
            </Card>
          );
        })}

        <Card
          title="GitHub"
          sub="Public repositories, languages and stars on student profiles"
          delay={0.1}
          status={github.failing ? <Status warn>{github.failing} failing</Status> : <Status ok>{github.tokenConfigured ? "Token set (5,000 requests/hour)" : "No token (60 requests/hour)"}</Status>}
        >
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Profiles loaded" value={github.ok} />
            <Stat label="Unknown usernames" value={github.notFound} />
            <Stat label="Last fetch" value={github.lastFetchAt ? <TimeAgo date={github.lastFetchAt} /> : "–"} />
          </div>
          <p className="text-xs text-muted">Stats are cached for 12 hours and refreshed in the background; when GitHub is down, the last copy is shown.{!github.tokenConfigured && " Set GITHUB_TOKEN to raise the rate limit."}</p>
        </Card>

        <Card
          title="Codeforces"
          sub="Rating, rank and contest history on student profiles"
          delay={0.15}
          status={codeforces.failing ? <Status warn>{codeforces.failing} failing</Status> : <Status ok>Public API</Status>}
        >
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Profiles loaded" value={codeforces.ok} />
            <Stat label="Unknown handles" value={codeforces.notFound} />
            <Stat label="Last fetch" value={codeforces.lastFetchAt ? <TimeAgo date={codeforces.lastFetchAt} /> : "–"} />
          </div>
          <p className="text-xs text-muted">Cached for 6 hours. No key needed.</p>
        </Card>

        <Card
          title={`Code runner · ${runner.label}`}
          sub="Runs and judges AlgoArena and contest submissions"
          delay={0.2}
          status={!runner.configured ? <Status>Not configured</Status> : runner.ok ? <Status ok>Working{runner.version ? ` · v${runner.version}` : ""}</Status> : <Status warn>Unreachable</Status>}
        >
          {!runner.configured ? (
            <p className="text-xs text-muted">Demo mode: submissions are saved as &ldquo;not executed&rdquo; and earn no XP. Set CODE_RUNNER=paiza (free, no key) or JUDGE0_URL to run code.</p>
          ) : runner.ok ? (
            <p className="text-xs text-muted">A test program ran in {runner.latencyMs} ms.{runner.mode === "paiza" ? " Free public runner: programs stop after about 1 second." : ""}</p>
          ) : (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-800">{runner.error} Students see &ldquo;couldn&apos;t reach the code runner&rdquo; and nothing is scored until it&apos;s back.</p>
          )}
        </Card>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Pill tone={data.cronConfigured ? "bridge" : "muted"}>{data.cronConfigured ? "Cron endpoint enabled" : "Cron endpoint off"}</Pill>
        Without a scheduler, imports also run after someone opens SkillBridge once they&apos;re due.
      </p>
    </div>
  );
}
