import { ArrowLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import Reveal from "@/components/common/Reveal";
import ApplicationsList from "@/components/skillbridge/ApplicationsList";
import { requireRole } from "@/lib/auth/session";
import { listMyApplications } from "@/services/applications";

export const metadata = { title: "My applications" };

async function Applications() {
  const { user } = await requireRole(["student"], { next: "/applications" });
  const items = await listMyApplications(user.id);
  return (
    <div className="space-y-5">
      <Link href="/skillbridge" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden="true" /> SkillBridge
      </Link>
      <Reveal>
        <header>
          <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
            <ListChecks size={22} className="text-bridge-600" aria-hidden="true" /> My applications
          </h1>
          <p className="mt-0.5 text-sm text-muted">Track every application and its history. You can withdraw until a final decision is made.</p>
        </header>
      </Reveal>
      {items.length ? (
        <ApplicationsList items={items} />
      ) : (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          You haven&apos;t applied anywhere yet. <Link href="/skillbridge?tab=foryou" className="text-bridge-600 hover:underline">See roles matched to you</Link>.
        </p>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Applications />
    </Suspense>
  );
}
