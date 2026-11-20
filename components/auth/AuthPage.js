import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured, isGoogleAuthConfigured } from "@/lib/utils/dataMode";
import AuthScreen from "./AuthScreen";

/** Signed-in visitors skip the form and go to /continue. Runs behind Suspense (reads cookies). */
async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/continue");
  return null;
}

/** Shared server wrapper for /login and /register. */
export default function AuthPage({ mode }) {
  const demoMode = !isDatabaseConfigured();
  return (
    <main className="flex-1">
      {!demoMode && (
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
      )}
      <Suspense fallback={<div className="min-h-screen" />}>
        <AuthScreen initialMode={mode} googleEnabled={!demoMode && isGoogleAuthConfigured()} demoMode={demoMode} />
      </Suspense>
    </main>
  );
}
