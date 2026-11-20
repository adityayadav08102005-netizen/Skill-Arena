"use client";

import { CheckCircle2, Link2, Loader2, LogOut } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SaveRow, SectionCard, TextField } from "@/components/profile/fields";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { authClient } from "@/lib/auth/client";

const LINK_ERRORS = {
  email_does_not_match: "That Google account uses a different email. Connect the Google account for the email shown above.",
  account_already_linked_to_different_user: "That Google account is already connected to another SkillArena account.",
};

/**
 * Connect Google to an account that was created with email and password.
 * Linking happens while you're signed in, so nobody can attach their Google
 * login to someone else's account. Afterwards "Continue with Google" works.
 */
function ConnectGoogle({ connected }) {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => {
    if (!params.has("link_error")) return "";
    // Better Auth appends its own code: /settings?link_error=google&error=<code>
    const code = params.getAll("error").find((c) => LINK_ERRORS[c]);
    return code ? LINK_ERRORS[code] : "Google didn't finish connecting. Try again.";
  });
  const justLinked = params.get("linked") === "google";

  async function connect() {
    setBusy(true);
    setError("");
    const { error: err } = await authClient.linkSocial({ provider: "google", callbackURL: "/settings?linked=google", errorCallbackURL: "/settings?link_error=google" });
    if (err) {
      setBusy(false);
      setError(err.message || "Couldn't start connecting Google.");
    }
  }

  if (connected) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-bridge-800">
        <CheckCircle2 size={15} aria-hidden="true" /> {justLinked ? "Google is now connected. You can use Continue with Google to sign in." : "Google is connected."}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={connect} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm transition-[translate,border-color] hover:-translate-y-0.5 hover:border-arena-300 disabled:opacity-60">
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <GoogleIcon size={14} />} Connect Google
      </button>
      {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}

export default function AccountSettings({ email, providers, googleEnabled = false }) {
  const router = useRouter();
  const hasPassword = providers.includes("credential");
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const bind = (key) => ({
    id: `pw-${key}`,
    type: "password",
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setError("");
      setStatus("idle");
    },
  });

  async function changePassword() {
    const fail = (msg) => {
      setError(msg);
      setStatus("error");
    };
    if (!form.current) return fail("Enter your current password.");
    if (form.next.length < 8) return fail("Use at least 8 characters for the new password.");
    if (form.next !== form.confirm) return fail("The new passwords don't match.");
    setStatus("saving");
    const { error: err } = await authClient.changePassword({
      currentPassword: form.current,
      newPassword: form.next,
      revokeOtherSessions: true,
    });
    if (err) return fail(err.message || "Couldn't change your password.");
    setForm({ current: "", next: "", confirm: "" });
    setStatus("saved");
  }

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Account" description="How you sign in to SkillArena.">
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Email</dt>
            <dd className="truncate">{email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Sign-in methods</dt>
            <dd>{providers.map((p) => (p === "credential" ? "Email and password" : p === "google" ? "Google" : p)).join(", ")}</dd>
          </div>
        </dl>
      </SectionCard>

      {googleEnabled && (
        <SectionCard
          title={<span className="inline-flex items-center gap-1.5"><Link2 size={15} aria-hidden="true" /> Connect Google</span>}
          description="Sign in with Google as well as your password. Use the Google account with the same email as above."
        >
          <ConnectGoogle connected={providers.includes("google")} />
        </SectionCard>
      )}

      {hasPassword ? (
        <SectionCard
          title="Change password"
          description="Signs you out on your other devices."
          footer={<SaveRow status={status} error={error} label="Change password" onClick={changePassword} />}
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
            <TextField label="Current password" autoComplete="current-password" {...bind("current")} />
            <TextField label="New password" autoComplete="new-password" {...bind("next")} />
            <TextField label="Confirm new password" autoComplete="new-password" {...bind("confirm")} />
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Password" description="You sign in with Google, so there's no SkillArena password to change." />
      )}

      <SectionCard title="Sign out" description="End your session on this device.">
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="inline-flex items-center gap-2 rounded-full border border-danger-600 px-4 py-2 text-sm text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
        >
          <LogOut size={15} aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </SectionCard>
    </div>
  );
}
