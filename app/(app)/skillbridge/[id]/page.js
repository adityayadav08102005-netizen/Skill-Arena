import { ArrowLeft, BadgeCheck, Building2, CalendarClock, CheckCircle2, MapPin, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import DemoBadge from "@/components/common/DemoBadge";
import Reveal from "@/components/common/Reveal";
import ApplyPanel from "@/components/skillbridge/ApplyPanel";
import { SourceBadge } from "@/components/skillbridge/OpportunityCard";
import SaveButton from "@/components/skillbridge/SaveButton";
import ReportButton from "@/components/common/ReportButton";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { EXPERIENCE_LABEL, MODE_LABEL, TYPE_LABEL, formatSalary } from "@/lib/utils/format";
import { APP_TIMEZONE, relativeTime } from "@/lib/utils/time";
import { getOpportunity } from "@/services/opportunities";

export const metadata = { title: "Opportunity" };

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric" });

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-bridge-50 text-bridge-600"><Icon size={15} aria-hidden="true" /></span>
      <div><div className="text-xs text-muted">{label}</div><div className="text-sm">{children}</div></div>
    </div>
  );
}

async function Detail({ params }) {
  await connection();
  const { id } = await params;
  const current = await getCurrentUser();
  const student = current?.user.role === "student" ? { id: current.user.id, profile: current.profile } : null;
  const item = await getOpportunity(id, student);
  if (!item) notFound();
  const now = new Date();
  const salary = formatSalary(item.salary);
  const matched = new Set(item.match?.matchedSkills ?? []);

  return (
    <div className="space-y-5">
      <Link href="/skillbridge" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden="true" /> SkillBridge
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Reveal>
            <header className="rounded-card border border-line bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <SourceBadge source={item.source} />
                    <span className="rounded-full bg-page px-2 py-0.5 text-muted">{TYPE_LABEL[item.type]}</span>
                    {!isDatabaseConfigured() && <DemoBadge label="Sample listing" />}
                    {item.closed && <span className="rounded-full bg-danger-50 px-2 py-0.5 text-danger-800">Closed</span>}
                  </div>
                  <h1 className="mt-2 text-2xl font-medium tracking-tight">{item.title}</h1>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-muted">
                    {item.companyName}
                    {item.company?.isVerified && <BadgeCheck size={15} className="text-bridge-600" aria-label="Verified company" />}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <SaveButton id={item.id} initial={item.saved} signedInStudent={Boolean(student)} />
                  {current && isDatabaseConfigured() && current.user.role !== "admin" && <ReportButton entityType="opportunity" entityId={item.id} what="listing" />}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Fact icon={MapPin} label="Location">{item.location} · {MODE_LABEL[item.workMode]}</Fact>
                <Fact icon={Wallet} label="Salary or stipend">{salary ?? "Not disclosed"}</Fact>
                <Fact icon={Building2} label="Experience">{EXPERIENCE_LABEL[item.experienceLevel]}</Fact>
                <Fact icon={CalendarClock} label="Deadline">
                  {item.deadline ? `${fmtDate(item.deadline)} (${relativeTime(item.deadline, now)})` : "Open until filled"} · posted {fmtDate(item.postedAt)}
                </Fact>
              </div>
            </header>
          </Reveal>

          {item.match && (
            <Reveal delay={0.05}>
              <section className="rounded-card border border-bridge-200 bg-bridge-50/50 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-medium">Your match</h2>
                  <span className="text-2xl font-medium text-bridge-600">{item.match.score}%</span>
                </div>
                {item.match.reasons.length > 0 && <p className="mt-1 text-sm text-muted">{item.match.reasons.join(" · ")}</p>}
                <ul className="mt-3 flex flex-wrap gap-1.5 text-sm">
                  {item.requiredSkills.map((s) => (
                    <li key={s} className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-2 py-0.5">
                      {matched.has(s) ? <CheckCircle2 size={13} className="text-bridge-600" aria-label="You have this" /> : <XCircle size={13} className="text-muted" aria-label="Missing" />}
                      {s}
                    </li>
                  ))}
                </ul>
                {item.match.missingSkills.length > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    Missing: {item.match.missingSkills.join(", ")}. If you know them, <Link href="/profile" className="text-bridge-600 hover:underline">add them to your profile</Link>.
                  </p>
                )}
              </section>
            </Reveal>
          )}

          <Reveal delay={0.1}>
            <section className="space-y-5 rounded-card border border-line bg-panel p-5 text-sm leading-relaxed">
              <div>
                <h2 className="mb-1 text-base font-medium">About the role</h2>
                <p className="whitespace-pre-line">{item.description}</p>
              </div>
              <div>
                <h2 className="mb-1 text-base font-medium">Skills</h2>
                <p>Required: {item.requiredSkills.join(", ") || "None listed"}</p>
                {item.preferredSkills.length > 0 && <p className="text-muted">Nice to have: {item.preferredSkills.join(", ")}</p>}
              </div>
              <div>
                <h2 className="mb-1 text-base font-medium">Eligibility</h2>
                <p className="whitespace-pre-line">{item.eligibility || "No specific requirements listed."}</p>
                {item.graduationYears.length > 0 && <p className="text-muted">Batches: {item.graduationYears.join(", ")}</p>}
              </div>
              <div>
                <h2 className="mb-1 text-base font-medium">About {item.companyName}</h2>
                <p className="whitespace-pre-line">{item.companyDescription || "No company description yet."}</p>
                {item.company && (
                  <p className="mt-1 text-muted">
                    {[item.company.industry, item.company.size && `${item.company.size} people`, item.company.location].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </section>
          </Reveal>
        </div>

        {/* Not wrapped in Reveal: the panel is position: sticky and must sit directly in the grid. */}
        <div>
          <ApplyPanel item={item} viewer={{ signedIn: Boolean(current), role: current?.user.role ?? null }} hasProfileResume={Boolean(current?.profile?.resumeFileId)} />
        </div>
      </div>
    </div>
  );
}

export default function OpportunityPage({ params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Detail params={params} />
    </Suspense>
  );
}
