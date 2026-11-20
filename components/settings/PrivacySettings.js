"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { SaveRow, SectionCard } from "@/components/profile/fields";
import { useSectionSave } from "@/hooks/useSectionSave";
import { cn } from "@/lib/utils/cn";

const STUDENT_ITEMS = [
  ["email", "Email address", "Let other signed-in users see your email."],
  ["resume", "Resume", "Let recruiters download your resume from your profile."],
  ["education", "Education", ""],
  ["experience", "Experience", ""],
  ["projects", "Projects", ""],
  ["codingStats", "Coding statistics", "Problems solved, streaks and contest results."],
  ["assessmentScores", "Assessment scores", ""],
  ["github", "GitHub", ""],
  ["linkedin", "LinkedIn", ""],
];
const RECRUITER_ITEMS = [
  ["email", "Email address", "Let students see your email on your profile."],
  ["linkedin", "LinkedIn", ""],
];

export function Toggle({ id, checked, onChange, label, description, disabled }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", disabled && "opacity-50")}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300", checked ? "bg-arena-600" : "bg-line")}
      >
        <motion.span
          className="absolute top-0.5 size-5 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </button>
    </div>
  );
}

export default function PrivacySettings({ role, isPublic: initialPublic, visibility: initialVisibility }) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [visibility, setVisibility] = useState(initialVisibility);
  const { save, status, error, clearError } = useSectionSave("privacy");
  const items = role === "recruiter" ? RECRUITER_ITEMS : STUDENT_ITEMS;

  const set = (key) => (value) => {
    setVisibility((v) => ({ ...v, [key]: value }));
    clearError();
  };

  return (
    <SectionCard
      title="Privacy"
      description="Choose what others can see on your public profile. You always see everything on your own."
      footer={<SaveRow status={status} error={error} onClick={() => save({ isPublic, visibility })} />}
    >
      <Toggle
        id="privacy-public"
        label="Public profile"
        description="When off, only you and admins can open your profile page."
        checked={isPublic}
        onChange={(v) => { setIsPublic(v); clearError(); }}
      />
      <div className="divide-y divide-line border-t border-line">
        {items.map(([key, label, description]) => (
          <Toggle key={key} id={`privacy-${key}`} label={label} description={description} checked={Boolean(visibility[key])} onChange={set(key)} disabled={!isPublic} />
        ))}
      </div>
    </SectionCard>
  );
}
