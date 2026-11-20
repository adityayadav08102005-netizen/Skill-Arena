"use client";

import { AnimatePresence, motion } from "motion/react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import Avatar from "@/components/app/Avatar";
import { UPLOAD_RULES } from "@/lib/utils/files";
import { cn } from "@/lib/utils/cn";
import { SectionCard } from "./fields";

const EXTENSIONS = { resume: [".pdf", ".doc", ".docx"], avatar: [".png", ".jpg", ".jpeg", ".webp"] };

/** Quick client-side check so obvious mistakes fail instantly; the server re-checks the real bytes. */
function precheck(kind, file) {
  const rules = UPLOAD_RULES[kind];
  if (!file) return "Choose a file to upload.";
  if (file.size > rules.maxBytes) return `That file is too large. Upload a ${rules.label}.`;
  if (!EXTENSIONS[kind].some((ext) => file.name.toLowerCase().endsWith(ext))) return `Unsupported file. Upload a ${rules.label}.`;
  return null;
}

function useUpload(kind, onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file) {
    const problem = precheck(kind, file);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/profile/${kind}`, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Upload failed. Try again.");
    onDone(data, true);
  }

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/profile/${kind}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Couldn't remove the file.");
    onDone(data, false);
  }

  return { upload, remove, busy, error };
}

function DropZone({ kind, onFile, busy }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center text-sm transition-all duration-300",
        over ? "scale-[1.01] border-arena-600 bg-arena-50" : "border-line hover:border-arena-200",
      )}
    >
      {busy ? <Loader2 size={20} className="animate-spin text-arena-600" aria-hidden="true" /> : <Upload size={20} className="text-arena-600" aria-hidden="true" />}
      <span className="text-muted">Drag a file here, or</span>
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="rounded-full border border-arena-600 px-3 py-1 text-arena-600 transition-colors hover:bg-arena-600 hover:text-white">
        Choose file
      </button>
      <span className="text-xs text-muted">{UPLOAD_RULES[kind].label}</span>
      <input
        ref={input}
        type="file"
        accept={EXTENSIONS[kind].join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}

export default function FilesSection({ userId, name, image, role, hasAvatar: initialAvatar, hasResume: initialResume, onSaved }) {
  const [hasAvatar, setHasAvatar] = useState(initialAvatar);
  const [hasResume, setHasResume] = useState(initialResume);
  const [version, setVersion] = useState(0);

  const avatar = useUpload("avatar", (data, present) => {
    setHasAvatar(present);
    setVersion(Date.now());
    onSaved?.({ ...data, filePatch: { avatarFileId: present ? data.fileId : null } });
  });
  const resume = useUpload("resume", (data, present) => {
    setHasResume(present);
    onSaved?.({ ...data, filePatch: { resumeFileId: present ? data.fileId : null } });
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Profile photo" description="Shown on your profile, leaderboards and applications.">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar userId={userId} name={name} image={image} hasAvatar={hasAvatar} version={version} size="lg" />
          <div className="min-w-60 flex-1">
            <DropZone kind="avatar" onFile={avatar.upload} busy={avatar.busy} />
          </div>
        </div>
        {hasAvatar && (
          <button type="button" onClick={avatar.remove} disabled={avatar.busy} className="mt-3 inline-flex items-center gap-1 text-sm text-muted hover:text-danger-600">
            <Trash2 size={14} aria-hidden="true" /> Remove photo
          </button>
        )}
        {avatar.error && <p role="alert" className="mt-2 text-sm text-danger-600">{avatar.error}</p>}
      </SectionCard>

      {role === "student" && (
        <SectionCard title="Resume" description="Attached to your applications. Choose who can see it in Settings.">
          <AnimatePresence mode="wait" initial={false}>
            {hasResume ? (
              <motion.div key="has" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                <span className="inline-flex items-center gap-2 text-sm">
                  <FileText size={18} className="text-arena-600" aria-hidden="true" /> Resume uploaded
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <a href={`/api/files/resume/${userId}`} className="text-arena-600 hover:underline">Download</a>
                  <button type="button" onClick={resume.remove} disabled={resume.busy} className="inline-flex items-center gap-1 text-muted hover:text-danger-600">
                    <Trash2 size={14} aria-hidden="true" /> Remove
                  </button>
                </span>
              </motion.div>
            ) : (
              <motion.div key="none" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <DropZone kind="resume" onFile={resume.upload} busy={resume.busy} />
              </motion.div>
            )}
          </AnimatePresence>
          {hasResume && (
            <div className="mt-3">
              <span className="text-xs text-muted">Upload a new file to replace it:</span>
              <div className="mt-2"><DropZone kind="resume" onFile={resume.upload} busy={resume.busy} /></div>
            </div>
          )}
          {resume.error && <p role="alert" className="mt-2 text-sm text-danger-600">{resume.error}</p>}
        </SectionCard>
      )}
    </div>
  );
}
