"use client";

import { motion } from "motion/react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/** Optimistic save toggle; reverts if the server says no. */
export default function SaveButton({ id, initial, signedInStudent, className }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (!signedInStudent) {
    return (
      <Link href="/login?next=%2Fskillbridge" aria-label="Log in to save" className={cn("rounded-full p-2 text-muted transition-colors hover:bg-page hover:text-ink", className)}>
        <Bookmark size={17} />
      </Link>
    );
  }

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !saved;
    setSaved(next);
    setBusy(true);
    const res = await fetch(`/api/opportunities/${id}/save`, { method: next ? "POST" : "DELETE" }).catch(() => null);
    if (!res?.ok) setSaved(!next);
    setBusy(false);
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.85 }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save opportunity"}
      className={cn("relative z-10 rounded-full p-2 transition-colors", saved ? "bg-bridge-50 text-bridge-600" : "text-muted hover:bg-page hover:text-ink", className)}
    >
      {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
    </motion.button>
  );
}
