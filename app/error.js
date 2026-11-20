"use client";

import { motion } from "motion/react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary for every page under the root layout. Server errors arrive
 * with a generic message and a digest (never the real details), which is
 * shown so a report can be matched to the server log.
 */
export default function ErrorPage({ error, retry }) {
  const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : null;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24 text-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
          <TriangleAlert size={26} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-medium tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">This page hit a problem on our side. Trying again usually fixes it; your saved work is safe.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => retry()} className="inline-flex items-center gap-1.5 rounded-full bg-arena-600 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            <RotateCcw size={15} aria-hidden="true" /> Try again
          </button>
          <Link href="/" className="rounded-full border border-line bg-panel px-4 py-2.5 text-sm transition-colors hover:border-arena-300">Back to SkillArena</Link>
        </div>
        {digest && <p className="mt-4 text-xs text-muted">Reference: <code className="font-mono">{digest}</code></p>}
      </motion.div>
    </div>
  );
}
