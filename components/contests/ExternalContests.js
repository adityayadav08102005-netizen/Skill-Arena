"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import TimeAgo from "@/components/common/TimeAgo";
import { cn } from "@/lib/utils/cn";
import { APP_TIMEZONE } from "@/lib/utils/time";

const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", { timeZone: APP_TIMEZONE, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const BADGE = {
  codeforces: "bg-info-50 text-info-800",
  leetcode: "bg-xp-50 text-xp-800",
  codechef: "bg-page text-ink",
};

export function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h} h ${m} m` : `${h} h`) : `${m} m`;
}

/** Upcoming contests on Codeforces, LeetCode and CodeChef, with a platform filter. */
export default function ExternalContests({ data }) {
  const [platform, setPlatform] = useState("all");
  const platforms = Object.entries(data.platforms ?? {});
  const items = data.items.filter((c) => platform === "all" || c.platform === platform);
  const down = platforms.filter(([, p]) => !p.available).map(([, p]) => p.label);

  return (
    <section className="space-y-3 rounded-card border border-line bg-panel p-4 sm:p-5" aria-labelledby="external-contests">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="external-contests" className="inline-flex items-center gap-2 text-base font-medium">
            <Globe size={17} className="text-arena-600" aria-hidden="true" /> On other platforms
          </h2>
          <p className="mt-0.5 text-sm text-muted">Upcoming rated contests. Register on their sites; times in IST.</p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Platform">
          {[["all", "All"], ...platforms.map(([k, p]) => [k, p.label])].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={platform === value}
              onClick={() => setPlatform(value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-all duration-200 hover:-translate-y-0.5",
                platform === value ? "border-transparent bg-arena-50 text-arena-800" : "border-line text-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {items.length ? (
        <ul className="grid gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line px-3.5 py-2.5 transition-colors hover:border-arena-200"
              >
                <div className="min-w-0">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", BADGE[c.platform])}>{data.platforms[c.platform]?.label}</span>
                  <p className="mt-1.5 truncate text-sm font-medium">{c.title}</p>
                  <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
                    <CalendarClock size={12} aria-hidden="true" /> {fmtDateTime(c.startsAt)} · {fmtDuration(c.durationMinutes)} · starts <TimeAgo date={c.startsAt} />
                  </p>
                </div>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-sm text-arena-600 transition-colors hover:bg-arena-50 hover:text-arena-800"
                >
                  Register <ExternalLink size={13} aria-hidden="true" />
                  <span className="sr-only">for {c.title} (opens {data.platforms[c.platform]?.label})</span>
                </a>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {platforms.length ? "No upcoming contests announced right now. Check back soon." : "Contest calendars appear here once a database is connected."}
        </p>
      )}

      <p className="text-[11px] text-muted">
        From Codeforces&apos; public API and LeetCode&apos;s and CodeChef&apos;s public contest lists
        {data.updatedAt && <> · updated <TimeAgo date={data.updatedAt} /></>}
        {down.length > 0 && <> · {down.join(", ")} couldn&apos;t be reached, showing the last saved list</>}
      </p>
    </section>
  );
}
