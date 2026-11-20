"use client";

import { motion } from "motion/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ApplicationStatus } from "@/components/dashboard/StatusPill";
import { EXPERIENCE_LABEL, MODE_LABEL, SOURCE_LABEL, TYPE_LABEL, formatSalary } from "@/lib/utils/format";
import { relativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import SaveButton from "./SaveButton";

const TONES = ["bg-arena-50 text-arena-800", "bg-bridge-50 text-bridge-800", "bg-xp-50 text-xp-800", "bg-info-50 text-info-800"];
const tone = (name) => TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];
const scoreTone = (s) => (s >= 75 ? "text-bridge-600" : s >= 50 ? "text-xp-700" : "text-muted");

export function SourceBadge({ source }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px]", source === "manual" ? "bg-arena-50 text-arena-800" : "bg-info-50 text-info-800")}>
      {source === "manual" ? "SkillArena" : `via ${SOURCE_LABEL[source] ?? source}`}
    </span>
  );
}

/** Job card: lifts on hover, fills the match bar, and slides the actions in. */
export default function OpportunityCard({ item, signedInStudent, index = 0, now }) {
  const salary = formatSalary(item.salary);
  const matched = new Set(item.match?.matchedSkills ?? []);
  const closesIn = item.deadline ? relativeTime(item.deadline, now) : null;
  const external = item.applyMethod === "external";

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4), ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative overflow-hidden rounded-card border border-line bg-panel p-4 transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1 hover:border-bridge-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl font-medium", tone(item.companyName))} aria-hidden="true">
            {item.companyName[0]}
          </span>
          <div className="min-w-0">
            <h3 className="font-medium leading-snug">
              <Link href={`/skillbridge/${item.id}`} className="after:absolute after:inset-0 group-hover:text-bridge-800">{item.title}</Link>
            </h3>
            <p className="truncate text-sm text-muted">
              {item.companyName} · {item.location} · {MODE_LABEL[item.workMode]}
              {salary ? ` · ${salary}` : ""}
            </p>
          </div>
        </div>
        {item.match && (
          <div className="shrink-0 text-right" title={item.match.reasons.join(" · ") || "Based on your skills and eligibility"}>
            <div className={cn("text-sm font-medium", scoreTone(item.match.score))}>{item.match.score}% match</div>
            <div className="ml-auto mt-1 h-1 w-20 overflow-hidden rounded-full bg-bridge-50">
              <div className="h-full w-0 rounded-full bg-bridge-400 transition-[width] duration-700 ease-snap group-hover:w-[var(--m)]" style={{ "--m": `${item.match.score}%` }} />
            </div>
            {!item.match.eligible && <div className="mt-1 text-[11px] text-danger-600">Not your batch</div>}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-lg bg-page px-2 py-0.5 text-xs text-muted">{TYPE_LABEL[item.type]}</span>
        <span className="rounded-lg bg-page px-2 py-0.5 text-xs text-muted">{EXPERIENCE_LABEL[item.experienceLevel]}</span>
        {item.requiredSkills.map((s) => (
          <span key={s} className={cn("rounded-lg border px-2 py-0.5 text-xs", matched.has(s) ? "border-bridge-200 text-bridge-800" : "border-line")}>
            {s}{matched.has(s) ? " ✓" : ""}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <SourceBadge source={item.source} />
          · posted {relativeTime(item.postedAt, now)}
          {closesIn ? ` · closes ${closesIn}` : ""}
        </span>
        <span className="relative z-10 flex items-center gap-1">
          <SaveButton id={item.id} initial={item.saved} signedInStudent={signedInStudent} />
          {item.application ? (
            <ApplicationStatus status={item.application.status} />
          ) : external && item.applyUrl ? (
            <a
              href={item.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex translate-x-2 items-center gap-1 rounded-full border border-bridge-600 px-3 py-1.5 text-sm text-bridge-600 opacity-0 transition-all duration-300 ease-snap group-hover:translate-x-0 group-hover:opacity-100 focus:translate-x-0 focus:opacity-100 max-md:translate-x-0 max-md:opacity-100"
            >
              Apply on source <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : (
            <Link
              href={`/skillbridge/${item.id}#apply`}
              className="inline-flex translate-x-2 items-center gap-1 rounded-full bg-bridge-600 px-3 py-1.5 text-sm font-medium text-white opacity-0 transition-all duration-300 ease-snap group-hover:translate-x-0 group-hover:opacity-100 focus:translate-x-0 focus:opacity-100 max-md:translate-x-0 max-md:opacity-100"
            >
              Apply <ArrowRight size={13} aria-hidden="true" />
            </Link>
          )}
        </span>
      </div>
    </motion.article>
  );
}
