import { Suspense } from "react";
import OnboardingForm from "@/components/auth/OnboardingForm";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Set up your account" };

async function Onboarding() {
  const { user } = await requireUser({ next: "/onboarding", onboarding: true });
  return <OnboardingForm name={user.name} email={user.email} image={user.image} />;
}

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense fallback={<div className="h-[520px] w-full max-w-md animate-pulse rounded-[20px] bg-panel" />}>
        <Onboarding />
      </Suspense>
    </main>
  );
}
