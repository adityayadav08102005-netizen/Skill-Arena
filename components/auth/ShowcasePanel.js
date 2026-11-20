"use client";

import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Check, Flame, Swords, Trophy } from "lucide-react";
import Link from "next/link";

// Decorative illustration only (aria-hidden): drifting skill chips and floating
// activity cards, re-themed for students (violet) or recruiters (teal).
const CHIPS = [
  { label: "Python", style: { left: "8%", top: "34%" }, drift: [16, 10], t: 6 },
  { label: "React", style: { right: "10%", top: "26%" }, drift: [-14, 12], t: 5.5 },
  { label: "Dynamic programming", style: { left: "10%", bottom: "8%" }, drift: [12, -12], t: 7 },
  { label: "DBMS 84%", style: { right: "6%", bottom: "14%" }, drift: [-10, -10], t: 6.5 },
  { label: "Graphs", style: { left: "46%", top: "40%" }, drift: [-12, 8], t: 8 },
];

const CARDS = {
  student: [
    { icon: Flame, text: "17-day streak", tone: "text-xp-600", style: { left: 16, top: "44%" } },
    { icon: Check, text: "Two sum · Accepted", tone: "text-bridge-600", style: { right: 14, top: "54%" } },
    { icon: Briefcase, text: "Shortlisted at Nimbus Labs", tone: "text-bridge-600", style: { left: 28, top: "65%" } },
    { icon: Trophy, text: "Rank 27 ↑4", tone: "text-arena-600", style: { right: 22, top: "76%" } },
  ],
  recruiter: [
    { icon: Briefcase, text: "12 new applicants", tone: "text-bridge-600", style: { left: 16, top: "44%" } },
    { icon: Check, text: "DSA 92% · Lv 14", tone: "text-arena-600", style: { right: 14, top: "54%" } },
    { icon: Trophy, text: "Shortlisted: Riya P.", tone: "text-bridge-600", style: { left: 28, top: "65%" } },
    { icon: Flame, text: "Interview Fri 3:00 PM", tone: "text-xp-600", style: { right: 22, top: "76%" } },
  ],
};

export default function ShowcasePanel({ role, headline, subline }) {
  const recruiter = role === "recruiter";
  return (
    <motion.div
      className="relative hidden min-h-[560px] overflow-hidden rounded-[20px] p-7 lg:block"
      animate={{ backgroundColor: recruiter ? "#e1f5ee" : "#eeedfe" }}
      transition={{ duration: 0.5 }}
    >
      {CHIPS.map((chip) => (
        <motion.span
          key={chip.label}
          aria-hidden="true"
          className="absolute rounded-full bg-white/65 px-3 py-1 text-xs text-muted"
          style={chip.style}
          animate={{ x: [0, chip.drift[0]], y: [0, chip.drift[1]] }}
          transition={{ duration: chip.t, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          {chip.label}
        </motion.span>
      ))}

      <Link href="/" className="relative z-10 inline-flex items-center gap-1.5 font-medium">
        <Swords size={18} className="text-arena-600" aria-hidden="true" />
        SkillArena
      </Link>

      <AnimatePresence mode="wait">
        <motion.div
          key={headline}
          className="relative z-10 mt-6 max-w-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-medium leading-tight tracking-tight">{headline}</h1>
          <p className="mt-2 leading-relaxed text-muted">{subline}</p>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {CARDS[recruiter ? "recruiter" : "student"].map(({ icon: Icon, text, tone, style }, i) => (
          <motion.div
            key={`${role}-${text}`}
            aria-hidden="true"
            className="absolute z-10 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm shadow-sm"
            style={style}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
            exit={{ opacity: 0, x: 14 }}
            transition={{
              opacity: { duration: 0.35, delay: i * 0.08 },
              x: { duration: 0.35, delay: i * 0.08 },
              y: { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 },
            }}
          >
            <Icon size={16} className={tone} />
            {text}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
