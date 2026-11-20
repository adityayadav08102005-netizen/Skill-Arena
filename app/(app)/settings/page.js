import { headers } from "next/headers";
import { Suspense } from "react";
import AccountSettings from "@/components/settings/AccountSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import { getAuth } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";
import { isGoogleAuthConfigured } from "@/lib/utils/dataMode";

export const metadata = { title: "Settings" };

async function Settings() {
  const { user, profile } = await requireUser({ next: "/settings" });
  const accounts = await getAuth().api.listUserAccounts({ headers: await headers() });
  const providers = [...new Set((accounts ?? []).map((a) => a.providerId))];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
      <PrivacySettings role={user.role} isPublic={profile.isPublic ?? true} visibility={profile.visibility ?? {}} />
      <AccountSettings email={user.email} providers={providers} googleEnabled={isGoogleAuthConfigured()} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Settings />
    </Suspense>
  );
}
