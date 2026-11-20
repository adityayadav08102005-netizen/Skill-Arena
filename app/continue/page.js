import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { homeFor } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Signing you in" };

/** Decides where a freshly signed-in user goes: setup step first, then their role's home. */
async function Continue() {
  const { user } = await requireUser({ next: "/continue" });
  redirect(homeFor(user.role));
}

export default function ContinuePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8 text-muted">
      <Suspense
        fallback={
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Signing you in…
          </span>
        }
      >
        <Continue />
      </Suspense>
    </main>
  );
}
