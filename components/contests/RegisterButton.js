"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/** Register / unregister for a contest. Unregistering is only offered before it starts. */
export default function RegisterButton({ slug, registered, state, viewer, size = "md" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!viewer?.signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/contests/${slug}`)}`} className="rounded-full border border-arena-600 px-4 py-1.5 text-sm text-arena-600 transition-colors hover:bg-arena-600 hover:text-white">
        Log in to register
      </Link>
    );
  }
  if (viewer.role !== "student") return null;
  if (state === "ended") return null;

  async function toggle() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/contests/${slug}/registration`, { method: registered ? "DELETE" : "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Couldn't update your registration.");
    router.refresh();
  }

  if (registered && state === "live") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-bridge-50 px-3 py-1.5 text-sm text-bridge-800"><Check size={14} aria-hidden="true" /> Registered</span>;
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={cn(
          "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full font-medium transition-colors",
          "before:absolute before:inset-0 before:-translate-x-[101%] before:transition-transform before:duration-300 before:ease-snap hover:before:translate-x-0",
          size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
          registered ? "border border-line text-muted before:bg-danger-50 hover:text-danger-800" : "bg-arena-600 text-white before:bg-ink",
        )}
      >
        {busy ? <Loader2 size={14} className="relative animate-spin" aria-hidden="true" /> : registered ? <Check size={14} className="relative" aria-hidden="true" /> : null}
        <span className="relative">{registered ? "Registered · unregister" : state === "live" ? "Join now" : "Register"}</span>
      </button>
      {error && <span role="alert" className="text-xs text-danger-600">{error}</span>}
    </span>
  );
}
