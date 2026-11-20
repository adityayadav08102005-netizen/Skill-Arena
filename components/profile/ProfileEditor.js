"use client";

import { AnimatePresence, motion } from "motion/react";
import { Eye, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import Avatar from "@/components/app/Avatar";
import ProgressRing from "@/components/common/ProgressRing";
import SlidingTabs from "@/components/common/SlidingTabs";
import { levelProgress } from "@/lib/utils/xp";
import BasicsSection from "./BasicsSection";
import FilesSection from "./FilesSection";
import ListSection from "./ListSection";
import SkillsSection from "./SkillsSection";

const toMonth = (d) => (d ? String(d).slice(0, 7) : "");

const SECTIONS = {
  education: {
    title: "Education",
    description: "Degrees and schools, most recent first.",
    addLabel: "Add education",
    emptyText: "No education added yet.",
    max: 10,
    fields: [
      { key: "institution", label: "Institution", wide: true },
      { key: "degree", label: "Degree", placeholder: "B.Tech" },
      { key: "fieldOfStudy", label: "Field of study", placeholder: "Computer Science" },
      { key: "startYear", label: "Start year", type: "year", placeholder: "2023" },
      { key: "endYear", label: "End year (or expected)", type: "year", placeholder: "2027" },
      { key: "grade", label: "Grade", placeholder: "8.4 CGPA" },
    ],
    toForm: (e) => ({ ...e, startYear: e.startYear ? String(e.startYear) : "", endYear: e.endYear ? String(e.endYear) : "" }),
    toBody: (e) => e,
  },
  experience: {
    title: "Experience",
    description: "Internships, jobs, freelance and volunteer work.",
    addLabel: "Add experience",
    emptyText: "No experience added yet. Internships and volunteering count.",
    fields: [
      { key: "title", label: "Title", placeholder: "Frontend intern" },
      { key: "organization", label: "Organization" },
      { key: "type", label: "Type", type: "select", options: [["internship", "Internship"], ["job", "Job"], ["freelance", "Freelance"], ["volunteer", "Volunteer"], ["other", "Other"]] },
      { key: "startDate", label: "Start", type: "month" },
      { key: "endDate", label: "End (leave empty if current)", type: "month" },
      { key: "description", label: "What you did", type: "textarea", wide: true },
    ],
    toForm: (e) => ({ ...e, startDate: toMonth(e.startDate), endDate: toMonth(e.endDate) }),
    toBody: (e) => e,
  },
  projects: {
    title: "Projects",
    description: "Things you have built. Link the code or a live demo.",
    addLabel: "Add project",
    emptyText: "No projects added yet.",
    fields: [
      { key: "title", label: "Project title", wide: true },
      { key: "techStack", label: "Tech stack", placeholder: "React, Node.js, MongoDB", wide: true },
      { key: "repoUrl", label: "Repository link", placeholder: "https://github.com/you/project" },
      { key: "liveUrl", label: "Live link", placeholder: "https://project.example.com" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    toForm: (p) => ({ ...p, techStack: (p.techStack ?? []).join(", ") }),
    toBody: (p) => ({ ...p, techStack: p.techStack.split(",").map((s) => s.trim()).filter(Boolean) }),
  },
};

export default function ProfileEditor({ user, profile: initialProfile, completion: initialCompletion, skillOptions }) {
  const student = user.role === "student";
  const [tab, setTab] = useState("basics");
  // Latest saved profile, so a section re-opened from its tab shows what was just saved.
  const [profile, setProfile] = useState(initialProfile);
  const [completion, setCompletion] = useState(initialCompletion);
  const [xp, setXp] = useState(initialProfile.xp ?? 0);
  const [toast, setToast] = useState(null);
  const name = profile.fullName;

  const onSaved = useCallback((data) => {
    if (data.completion) setCompletion(data.completion);
    if (data.profile) setProfile(data.profile);
    if (data.filePatch) setProfile((p) => ({ ...p, ...data.filePatch }));
    if (data.xp?.awarded) {
      setXp(data.xp.xp);
      setToast(`+50 XP: profile complete${data.xp.leveledUp ? ` · level ${data.xp.level}` : ""}`);
      setTimeout(() => setToast(null), 4000);
    }
  }, []);

  const tabs = student
    ? [
        { value: "basics", label: "Basics" },
        { value: "skills", label: "Skills" },
        { value: "education", label: "Education" },
        { value: "experience", label: "Experience" },
        { value: "projects", label: "Projects" },
        { value: "files", label: "Photo and resume" },
      ]
    : [
        { value: "basics", label: "Basics" },
        { value: "files", label: "Photo" },
      ];

  const level = levelProgress(xp);

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-wrap items-center gap-5 rounded-card border border-line bg-panel p-5"
      >
        <Avatar userId={user.id} name={name} image={user.image} hasAvatar={Boolean(profile.avatarFileId)} version={profile.avatarFileId} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-medium">{name}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-arena-50 px-2.5 py-0.5 capitalize text-arena-800">{user.role}</span>
            {student && (
              <span className="inline-flex items-center gap-1 rounded-full bg-xp-50 px-2.5 py-0.5 text-xp-800">
                <Flame size={12} aria-hidden="true" /> Level {level.level} · {xp.toLocaleString("en-IN")} XP
              </span>
            )}
            <Link href={`/u/${user.id}`} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-muted transition-colors hover:border-arena-200 hover:text-ink">
              <Eye size={12} aria-hidden="true" /> View public profile
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRing percent={completion.percent} label={`Profile ${completion.percent}% complete`} />
          <div className="max-w-56 text-xs text-muted">
            {completion.percent === 100 ? (
              <span className="text-bridge-600">Profile complete</span>
            ) : (
              <>
                <div className="font-medium text-ink">Still missing</div>
                {completion.missing.slice(0, 3).join(", ")}
                {completion.missing.length > 3 ? ` and ${completion.missing.length - 3} more` : ""}
                {student && <div className="mt-1 text-xp-700">Complete it for +50 XP</div>}
              </>
            )}
          </div>
        </div>
      </motion.header>

      <div className="overflow-x-auto pb-1">
        <SlidingTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Profile sections" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
          {tab === "basics" && <BasicsSection profile={profile} role={user.role} onSaved={onSaved} />}
          {tab === "skills" && <SkillsSection profile={profile} skillOptions={skillOptions} onSaved={onSaved} />}
          {SECTIONS[tab] && <ListSection section={tab} initial={profile[tab]} onSaved={onSaved} {...SECTIONS[tab]} />}
          {tab === "files" && (
            <FilesSection
              userId={user.id}
              name={name}
              image={user.image}
              role={user.role}
              hasAvatar={Boolean(profile.avatarFileId)}
              hasResume={Boolean(profile.resumeFileId)}
              onSaved={onSaved}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-24 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-float"
          >
            <Sparkles size={15} className="text-xp-200" aria-hidden="true" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
