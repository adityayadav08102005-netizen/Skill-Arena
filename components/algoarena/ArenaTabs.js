"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/algoarena", label: "Problems" },
  { href: "/algoarena/daily", label: "Daily challenge" },
  { href: "/algoarena/codeforces", label: "Codeforces practice" },
];

/** Link tabs across the AlgoArena sections, with a sliding highlight. */
export default function ArenaTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="AlgoArena sections" className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-panel p-1 shadow-float">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200", active ? "text-arena-800" : "text-muted hover:text-ink")}
          >
            {active && <motion.span layoutId="arena-tab" className="absolute inset-0 rounded-full bg-arena-50" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
