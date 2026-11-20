"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building2, ChevronDown, Database, GraduationCap, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { safeNext } from "@/lib/auth/routes";
import { cn } from "@/lib/utils/cn";
import GoogleIcon from "./GoogleIcon";
import ShowcasePanel from "./ShowcasePanel";

const COPY = {
  in: {
    student: ["Welcome back to the arena.", "Your streak, XP and applications are waiting."],
    recruiter: ["Welcome back, recruiter.", "Your listings and applicants are waiting."],
  },
  up: {
    student: ["Start your streak today.", "Practice, compete, take assessments and apply with one profile."],
    recruiter: ["Hire students by proven skill.", "Post roles and review coding and assessment scores."],
  },
};

const ERRORS_FROM_QUERY = {
  google: "Google sign-in didn't finish. Try again.",
  account_not_linked:
    "This email already has a SkillArena account with a password. Log in with your password, then connect Google in Settings. After that, Continue with Google works.",
};

/** Better Auth appends its own code after ours (?error=google&error=account_not_linked): prefer the most specific one we know. */
function errorFromQuery(params) {
  const codes = params.getAll("error");
  const known = [...codes].reverse().find((c) => ERRORS_FROM_QUERY[c] && c !== "google") ?? codes.find((c) => ERRORS_FROM_QUERY[c]);
  return known ? ERRORS_FROM_QUERY[known] : "";
}

const ROLES = [
  { value: "student", label: "Student", hint: "Practice and apply", icon: GraduationCap },
  { value: "recruiter", label: "Recruiter", hint: "Hire students", icon: Building2 },
];

/**
 * The approved combined login / sign-up screen: showcase panel on the left;
 * log in / create account toggle, student/recruiter cards, Google button and
 * an expandable email form on the right.
 *
 * The role picked here is only a starting choice: it pre-selects the one-time
 * setup step, where the server actually assigns it.
 */
export default function AuthScreen({ initialMode, googleEnabled, demoMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const formId = useId();

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(params.get("role") === "recruiter" ? "recruiter" : "student");
  const [emailOpen, setEmailOpen] = useState(!googleEnabled || params.getAll("error").includes("account_not_linked"));
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(() => errorFromQuery(params));
  const [busy, setBusy] = useState(null); // "email" | "google" | null

  const next = safeNext(params.get("next"));
  const signUp = mode === "up";
  const recruiter = role === "recruiter";
  const [headline, subline] = COPY[mode][role];

  const switchMode = (value) => {
    setMode(value);
    setError("");
    window.history.replaceState(null, "", value === "up" ? "/register" : "/login");
  };

  const update = (key) => (e) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setError("");
  };

  async function continueWithGoogle() {
    setError("");
    setBusy("google");
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      newUserCallbackURL: `/onboarding?role=${role}`,
      errorCallbackURL: "/login?error=google",
    });
    if (err) {
      setError(err.message || "Couldn't reach Google. Try again.");
      setBusy(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const name = fields.name.trim();
    const email = fields.email.trim();
    if (signUp && !name) return setError("Enter your full name.");
    if (!email) return setError("Enter your email.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email.");
    if (!fields.password) return setError("Enter your password.");
    if (signUp && fields.password.length < 8) return setError("Use at least 8 characters for your password.");

    setBusy("email");
    const { error: err } = signUp
      ? await authClient.signUp.email({ name, email, password: fields.password })
      : await authClient.signIn.email({ email, password: fields.password });
    if (err) {
      setBusy(null);
      if (err.status === 503) return setError("Accounts need a connected database. This site is in demo mode.");
      if (err.status === 429) return setError("Too many attempts. Wait a minute and try again.");
      return setError(err.message || "Something went wrong. Try again.");
    }
    router.push(signUp ? `/onboarding?role=${role}` : next);
    router.refresh();
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-4 p-4 lg:grid-cols-2">
      <ShowcasePanel role={role} headline={headline} subline={subline} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="mx-auto w-full max-w-md rounded-[20px] border border-line bg-panel p-6 shadow-sm sm:p-7"
        style={{ "--acc": recruiter ? "var(--sa-bridge-600)" : "var(--sa-arena-600)" }}
      >
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink lg:hidden">
          ← SkillArena
        </Link>

        {demoMode && (
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-xp-50 px-3 py-2.5 text-sm text-xp-800">
            <Database size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Demo mode: sign-in needs a connected MongoDB database. See the README to connect one.
          </p>
        )}

        <div role="tablist" aria-label="Log in or create account" className="relative grid grid-cols-2 rounded-full bg-page p-1">
          {[
            ["in", "Log in"],
            ["up", "Create account"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={cn("relative rounded-full py-2 text-sm transition-colors", mode === value ? "font-medium text-ink" : "text-muted")}
            >
              {mode === value && (
                <motion.span layoutId={`${formId}-mode`} className="absolute inset-0 rounded-full bg-panel shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        <fieldset className="mt-4">
          <legend className="sr-only">I am a</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(({ value, label, hint, icon: Icon }) => {
              const active = role === value;
              const teal = value === "recruiter";
              return (
                <label
                  key={value}
                  className={cn(
                    "cursor-pointer rounded-2xl border p-3 transition-all duration-300 ease-snap hover:-translate-y-0.5",
                    active ? (teal ? "border-bridge-600 bg-bridge-50" : "border-arena-600 bg-arena-50") : "border-line",
                  )}
                >
                  <input type="radio" name="role" value={value} checked={active} onChange={() => setRole(value)} className="sr-only" />
                  <Icon size={18} className={teal ? "text-bridge-600" : "text-arena-600"} aria-hidden="true" />
                  <div className="mt-1 text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted">{hint}</div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {googleEnabled && (
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={busy !== null}
            className="group relative mt-4 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-ink py-3 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 before:absolute before:inset-0 before:-translate-x-[101%] before:bg-[var(--acc)] before:transition-transform before:duration-400 before:ease-snap hover:before:translate-x-0"
          >
            <span className="relative flex size-6 items-center justify-center rounded-full bg-white">
              {busy === "google" ? <Loader2 size={14} className="animate-spin text-ink" /> : <GoogleIcon size={14} />}
            </span>
            <span className="relative">
              {signUp ? `Sign up with Google as a ${role}` : "Continue with Google"}
            </span>
          </button>
        )}

        {googleEnabled ? (
          <button
            type="button"
            onClick={() => setEmailOpen((v) => !v)}
            aria-expanded={emailOpen}
            aria-controls={`${formId}-email`}
            className="mt-4 flex w-full items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line"
          >
            <span className="inline-flex items-center gap-1">
              or use email
              <ChevronDown size={14} className={cn("transition-transform duration-300", emailOpen && "rotate-180")} aria-hidden="true" />
            </span>
          </button>
        ) : (
          <p className="mt-4 flex items-center gap-1.5 text-sm text-muted">
            <Mail size={14} aria-hidden="true" /> {signUp ? "Sign up" : "Log in"} with email
          </p>
        )}

        <AnimatePresence initial={false}>
          {emailOpen && (
            <motion.form
              id={`${formId}-email`}
              key="email-form"
              onSubmit={submit}
              noValidate
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-3 px-0.5 pb-0.5 pt-3">
                <AnimatePresence initial={false}>
                  {signUp && (
                    <motion.div key="name" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <Field id={`${formId}-name`} label="Full name" autoComplete="name" value={fields.name} onChange={update("name")} placeholder="Aarav Mehta" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Field
                  id={`${formId}-email-input`}
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={fields.email}
                  onChange={update("email")}
                  placeholder={recruiter ? "priya@company.com" : "aarav@college.edu"}
                />
                <Field
                  id={`${formId}-password`}
                  label="Password"
                  type="password"
                  autoComplete={signUp ? "new-password" : "current-password"}
                  value={fields.password}
                  onChange={update("password")}
                  placeholder={signUp ? "At least 8 characters" : "Your password"}
                />

                <button
                  type="submit"
                  disabled={busy !== null}
                  className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[var(--acc)] py-2.5 text-sm font-medium text-white before:absolute before:inset-0 before:-translate-x-[101%] before:bg-ink before:transition-transform before:duration-400 before:ease-snap hover:before:translate-x-0"
                >
                  {busy === "email" && <Loader2 size={16} className="relative animate-spin" aria-hidden="true" />}
                  <span className="relative">{signUp ? `Create ${role} account` : "Log in"}</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p role="alert" aria-live="polite" className="mt-3 min-h-5 text-sm text-danger-600">
          {error}
        </p>

        <p className="mt-2 text-center text-xs text-muted">
          {signUp ? "Already have an account? " : "New to SkillArena? "}
          <button type="button" onClick={() => switchMode(signUp ? "in" : "up")} className="text-[var(--acc)] hover:underline">
            {signUp ? "Log in" : "Create an account"}
          </button>
        </p>
        <p className="mt-2 text-center text-[11px] text-muted">
          By continuing you agree to how we handle your data in our{" "}
          <a href="/privacy" className="underline-offset-2 hover:text-ink hover:underline">privacy policy</a>.
        </p>
      </motion.div>
    </div>
  );
}

function Field({ id, label, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <input
        id={id}
        className="h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-arena-200 focus:border-[var(--acc)] focus:ring-4 focus:ring-arena-50"
        {...props}
      />
    </div>
  );
}
