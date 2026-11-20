import { Swords } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-panel mt-auto">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <Swords size={16} className="text-arena-600" aria-hidden="true" /> SkillArena
        </span>
        <span className="flex items-center gap-4">
          <span>Learn. Code. Compete. Get Hired.</span>
          <Link href="/privacy" className="transition-colors hover:text-ink">Privacy</Link>
        </span>
      </div>
      <div className="border-t border-line text-center py-3 text-xs text-muted">
        © 2060 Aditya Raj. All rights reserved.
      </div>
    </footer>
  );
}
