import { PlugZap } from "lucide-react";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import IntegrationsPanel from "@/components/admin/IntegrationsPanel";
import { requireRole } from "@/lib/auth/session";
import { integrationsStatus } from "@/services/integrations";

export const metadata = { title: "Integrations · Admin" };

async function Content() {
  await requireRole(["admin"], { next: "/admin/integrations" });
  const data = await integrationsStatus();
  return (
    <div className="space-y-5">
      <AdminHeader icon={PlugZap} title="Integrations" sub="External services SkillArena uses. Each one has a fallback, so an outage never takes a page down." />
      <IntegrationsPanel data={data} />
    </div>
  );
}

export default function AdminIntegrationsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content />
    </Suspense>
  );
}
