"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ExternalLink, FileText, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ApplicationStatus } from "@/components/dashboard/StatusPill";
import { UPLOAD_RULES } from "@/lib/utils/files";
import { SOURCE_LABEL } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const ACCEPT = ".pdf,.doc,.docx";

/** The sticky apply box on the opportunity page. Handles every state honestly. */
export default function ApplyPanel({ item, viewer, hasProfileResume }) {
  const router = useRouter();
  const fileInput = useRef(null);
  const [choice, setChoice] = useState(hasProfileResume ? "profile" : "upload");
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const shell = (children) => (
    <section id="apply" className="scroll-mt-24 rounded-card border border-line bg-panel p-5 lg:sticky lg:top-20">{children}</section>
  );

  if (item.applyMethod === "external") {
    return shell(
      <>
        <h2 className="font-medium">Apply on {SOURCE_LABEL[item.source] ?? "the source site"}</h2>
        <p className="mt-1 text-sm text-muted">This listing comes from {SOURCE_LABEL[item.source] ?? "an external job board"}. Applications go through their site.</p>
        {item.applyUrl && (
          <a href={item.applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-bridge-600 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            Open the original listing <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </>,
    );
  }

  if (item.applicationDetail || done) {
    const status = item.applicationDetail?.status ?? "applied";
    return shell(
      <>
        <motion.div initial={done ? { scale: 0.6, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
          <CheckCircle2 size={22} className="text-bridge-600" aria-hidden="true" />
          <h2 className="font-medium">{done ? "Application sent" : "You've applied"}</h2>
        </motion.div>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">Status <ApplicationStatus status={status} /></p>
        <Link href="/applications" className="mt-4 inline-block text-sm text-bridge-600 hover:underline">Track it in My applications</Link>
      </>,
    );
  }

  if (item.closed) return shell(<><h2 className="font-medium">Applications closed</h2><p className="mt-1 text-sm text-muted">This role is no longer accepting applications.</p></>);
  if (!viewer.signedIn) {
    return shell(
      <>
        <h2 className="font-medium">Apply with your SkillArena profile</h2>
        <p className="mt-1 text-sm text-muted">Your skills, coding stats and assessment scores go with your application.</p>
        <Link href={`/login?next=${encodeURIComponent(`/skillbridge/${item.id}`)}`} className="mt-4 inline-flex w-full justify-center rounded-full bg-bridge-600 px-4 py-2.5 text-sm font-medium text-white">Log in to apply</Link>
      </>,
    );
  }
  if (viewer.role !== "student") return shell(<p className="text-sm text-muted">Only student accounts can apply.</p>);
  if (item.match && !item.match.eligible) {
    return shell(
      <>
        <h2 className="font-medium">Not open to your batch</h2>
        <p className="mt-1 text-sm text-muted">This role accepts the {item.graduationYears.join(", ")} batch{item.graduationYears.length > 1 ? "es" : ""}.</p>
      </>,
    );
  }

  function pick(f) {
    setError("");
    if (!f) return;
    if (f.size > UPLOAD_RULES.resume.maxBytes || !/\.(pdf|docx?)$/i.test(f.name)) {
      setFile(null);
      return setError(`Upload a ${UPLOAD_RULES.resume.label}.`);
    }
    setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (choice === "upload" && !file) return setError("Attach your resume.");
    if (cover.length > 4000) return setError("Keep the cover letter under 4,000 characters.");
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("resumeChoice", choice);
    form.set("coverLetter", cover);
    if (choice === "upload") form.set("file", file);
    const res = await fetch(`/api/opportunities/${item.id}/apply`, { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setError(data?.error || "Couldn't send your application. Try again.");
    setDone(true);
    router.refresh();
  }

  return shell(
    <form onSubmit={submit} noValidate>
      <h2 className="font-medium">Apply</h2>
      <p className="mt-0.5 text-xs text-muted">Recruiters also see your public profile, coding stats and assessment scores.</p>

      <fieldset className="mt-4 space-y-2">
        <legend className="mb-1 text-xs text-muted">Resume</legend>
        {hasProfileResume && (
          <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm transition-colors", choice === "profile" ? "border-bridge-600 bg-bridge-50" : "border-line hover:border-bridge-200")}>
            <input type="radio" name="resume" checked={choice === "profile"} onChange={() => setChoice("profile")} className="accent-[var(--sa-bridge-600)]" />
            <FileText size={16} className="text-bridge-600" aria-hidden="true" /> Use my profile resume
          </label>
        )}
        <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm transition-colors", choice === "upload" ? "border-bridge-600 bg-bridge-50" : "border-line hover:border-bridge-200")}>
          <input type="radio" name="resume" checked={choice === "upload"} onChange={() => setChoice("upload")} className="accent-[var(--sa-bridge-600)]" />
          <Upload size={16} className="text-bridge-600" aria-hidden="true" /> Attach a resume for this role
        </label>
        <AnimatePresence initial={false}>
          {choice === "upload" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-bridge-200 px-3 py-3 text-sm transition-colors hover:bg-bridge-50"
              >
                <span className="truncate">{file ? file.name : "Choose a file"}</span>
                <span className="shrink-0 text-xs text-muted">{UPLOAD_RULES.resume.label}</span>
              </button>
              <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
            </motion.div>
          )}
        </AnimatePresence>
        {!hasProfileResume && (
          <p className="text-xs text-muted">
            Tip: <Link href="/profile" className="text-bridge-600 hover:underline">add a resume to your profile</Link> to apply faster next time.
          </p>
        )}
      </fieldset>

      <div className="mt-4">
        <label htmlFor="cover" className="mb-1 flex justify-between text-xs text-muted">
          Cover letter (optional) <span>{cover.length}/4000</span>
        </label>
        <textarea
          id="cover"
          value={cover}
          onChange={(e) => { setCover(e.target.value); setError(""); }}
          rows={5}
          maxLength={4000}
          placeholder="Why you're a good fit, in a few lines."
          className="w-full resize-y rounded-xl border border-line px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] focus:border-bridge-400 focus:ring-4 focus:ring-bridge-50"
        />
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-danger-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-bridge-600 py-2.5 text-sm font-medium text-white before:absolute before:inset-0 before:-translate-x-[101%] before:bg-bridge-800 before:transition-transform before:duration-400 before:ease-snap hover:before:translate-x-0"
      >
        {busy && <Loader2 size={15} className="relative animate-spin" aria-hidden="true" />}
        <span className="relative">{busy ? "Sending…" : "Send application"}</span>
      </button>
    </form>,
  );
}
