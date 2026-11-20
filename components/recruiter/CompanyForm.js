"use client";

import { Building2, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { SaveRow, SectionCard, SelectField, TextArea, TextField } from "@/components/profile/fields";
import { UPLOAD_RULES } from "@/lib/utils/files";

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map((s) => [s, `${s} people`]);

export default function CompanyForm({ company }) {
  const [v, setV] = useState({
    name: company.name ?? "",
    description: company.description ?? "",
    website: company.website ?? "",
    industry: company.industry ?? "",
    size: company.size ?? "11-50",
    location: company.location ?? "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [logo, setLogo] = useState({ has: company.hasLogo, version: 0, busy: false, error: "" });
  const input = useRef(null);

  const bind = (key) => ({
    id: `company-${key}`,
    value: v[key],
    onChange: (e) => {
      setV((s) => ({ ...s, [key]: e.target.value }));
      setStatus("idle");
      setError("");
    },
  });

  async function save(e) {
    e.preventDefault();
    if (!v.name.trim()) {
      setStatus("error");
      return setError("Enter the company name.");
    }
    setStatus("saving");
    const res = await fetch("/api/recruiter/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setStatus("error");
      return setError(data?.error || "Couldn't save.");
    }
    setStatus("saved");
  }

  async function uploadLogo(file) {
    if (!file) return;
    if (file.size > UPLOAD_RULES.logo.maxBytes || !/\.(png|jpe?g|webp)$/i.test(file.name)) return setLogo((l) => ({ ...l, error: `Upload a ${UPLOAD_RULES.logo.label}.` }));
    setLogo((l) => ({ ...l, busy: true, error: "" }));
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/recruiter/company/logo", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setLogo((l) => (res?.ok ? { has: true, version: Date.now(), busy: false, error: "" } : { ...l, busy: false, error: data?.error || "Upload failed." }));
  }

  async function removeLogo() {
    setLogo((l) => ({ ...l, busy: true }));
    const res = await fetch("/api/recruiter/company/logo", { method: "DELETE" }).catch(() => null);
    setLogo((l) => ({ ...l, busy: false, has: res?.ok ? false : l.has }));
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Logo" description="Shown on your listings and in students' application tracker.">
        <div className="flex flex-wrap items-center gap-4">
          {logo.has ? (
            // eslint-disable-next-line @next/next/no-img-element -- served by our own file API
            <img src={`/api/files/logo/${company.id}?v=${logo.version}`} alt={`${v.name} logo`} className="size-16 rounded-2xl border border-line object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-2xl bg-bridge-50 text-bridge-600"><Building2 size={24} aria-hidden="true" /></span>
          )}
          <button type="button" onClick={() => input.current?.click()} disabled={logo.busy} className="inline-flex items-center gap-1.5 rounded-full border border-bridge-600 px-4 py-2 text-sm text-bridge-600 transition-colors hover:bg-bridge-600 hover:text-white">
            {logo.busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />} {logo.has ? "Replace logo" : "Upload logo"}
          </button>
          {logo.has && (
            <button type="button" onClick={removeLogo} disabled={logo.busy} className="inline-flex items-center gap-1 text-sm text-muted hover:text-danger-600">
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          )}
          <input ref={input} type="file" accept=".png,.jpg,.jpeg,.webp" className="sr-only" tabIndex={-1} onChange={(e) => { uploadLogo(e.target.files?.[0]); e.target.value = ""; }} />
          <span className="text-xs text-muted">{UPLOAD_RULES.logo.label}</span>
        </div>
        {logo.error && <p role="alert" className="mt-2 text-sm text-danger-600">{logo.error}</p>}
      </SectionCard>

      <form onSubmit={save} noValidate>
        <SectionCard title="Company details" description="Students see this on every listing you post." footer={<SaveRow type="submit" status={status} error={error} />}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <TextField label="Company name" required {...bind("name")} />
            <TextField label="Website" placeholder="https://company.com" inputMode="url" {...bind("website")} />
            <TextField label="Industry" placeholder="Fintech" {...bind("industry")} />
            <SelectField label="Company size" options={SIZES} {...bind("size")} />
            <TextField className="sm:col-span-2" label="Location" placeholder="Pune, India" {...bind("location")} />
            <TextArea className="sm:col-span-2" rows={5} label="About the company" placeholder="What you build, your team and culture." {...bind("description")} />
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
