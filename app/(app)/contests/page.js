import { Swords } from "lucide-react";
import { after, connection } from "next/server";
import { Suspense } from "react";
import DemoBadge from "@/components/common/DemoBadge";
import Reveal from "@/components/common/Reveal";
import ContestCard from "@/components/contests/ContestCard";
import ExternalContests from "@/components/contests/ExternalContests";
import { contests as demoContests } from "@/data/demo/contests";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { ensureScheduledContests, scheduleDue } from "@/services/contestScheduler";
import { ensureContestReminders, listContests } from "@/services/contests";
import { getExternalContests } from "@/services/externalContests";

export const metadata = { title: "Contests" };

function demoList() {
  const now = Date.now();
  const rows = demoContests.map((c) => {
    const startsAt = new Date(now + c.startsInHours * 3_600_000);
    const endsAt = new Date(startsAt.getTime() + c.durationMinutes * 60_000);
    const state = now < startsAt.getTime() ? "upcoming" : now < endsAt.getTime() ? "live" : "ended";
    return {
      id: c.id, slug: c.slug, title: c.title, startsAt, endsAt, durationMinutes: c.durationMinutes, state,
      problemCount: c.problems.length, totalPoints: c.problems.reduce((s, p) => s + p.points, 0), participants: 0, registered: false, myResult: null,
    };
  });
  return { live: rows.filter((r) => r.state === "live"), upcoming: rows.filter((r) => r.state === "upcoming"), past: rows.filter((r) => r.state === "ended") };
}

function Section({ title, items, viewer, empty, linked }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      {items.length ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          {items.map((c, i) => <ContestCard key={c.id} contest={c} viewer={viewer} delay={i * 0.05} linked={linked} />)}
        </div>
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

async function Contests() {
  await connection();
  const demo = !isDatabaseConfigured();
  const current = demo ? null : await getCurrentUser();
  const viewer = { signedIn: Boolean(current), role: current?.user.role ?? null };
  if (current?.user.role === "student") await ensureContestReminders(current.user.id);
  // The very first visit creates the scheduled contests inline so the page isn't empty; later
  // top-ups (a new week coming into range) happen after the response is sent.
  if (!demo && (await scheduleDue())) {
    const upcoming = await listContests(null);
    if (!upcoming.upcoming.length && !upcoming.live.length) await ensureScheduledContests();
    else after(() => ensureScheduledContests().catch((error) => console.error("contest scheduling failed", error)));
  }
  const [data, external] = await Promise.all([
    demo ? demoList() : listContests(current?.user.role === "student" ? current.user.id : null),
    getExternalContests().catch((error) => {
      console.error("contest calendar failed", error);
      return { items: [], platforms: {} };
    }),
  ]);

  return (
    <div className="space-y-6">
      <Reveal>
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
            <Swords size={22} className="text-arena-600" aria-hidden="true" /> Contests
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Timed rounds with live rankings. Each solved problem scores its points; wrong attempts add a time penalty.
            {demo && <DemoBadge className="ml-2 align-middle" label="Demo data: connect a database to register" />}
          </p>
        </header>
      </Reveal>
      {data.live.length > 0 && <Section title="Live now" items={data.live} viewer={viewer} linked={!demo} />}
      <Section title="Upcoming" items={data.upcoming} viewer={viewer} empty="No contests scheduled yet." linked={!demo} />
      <ExternalContests data={external} />
      <Section title="Past contests" items={data.past} viewer={viewer} empty="No finished contests yet." linked={!demo} />
    </div>
  );
}

export default function ContestsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Contests />
    </Suspense>
  );
}
