"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Floating bottom dock for the signed-in app (used from Phase 3 on). The
 * highlight follows the hovered item and settles back on the active route;
 * labels pop up above each icon. `items` is [{ href, label, icon }].
 */
export default function FloatingDock({ items, ariaLabel = "App" }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(null);
  // Longest matching link wins, so /recruiter/listings highlights "Listings", not "/recruiter".
  const active = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const highlighted = hovered ?? active;

  return (
    <nav aria-label={ariaLabel} className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <ul
        className="flex max-w-full flex-wrap justify-center gap-0.5 rounded-[18px] border border-line bg-panel/95 p-1 shadow-float backdrop-blur-md sm:gap-1 sm:p-1.5"
        onMouseLeave={() => setHovered(null)}
      >
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href} className="group relative">
            <Link
              href={href}
              aria-label={label}
              aria-current={href === active ? "page" : undefined}
              onMouseEnter={() => setHovered(href)}
              onFocus={() => setHovered(href)}
              onBlur={() => setHovered(null)}
              className={cn(
                "relative flex size-8 items-center justify-center rounded-xl transition-[color,translate] duration-200 sm:size-10",
                highlighted === href ? "-translate-y-0.5 text-arena-800" : "text-muted",
              )}
            >
              {highlighted === href && (
                <motion.span
                  layoutId="floating-dock-highlight"
                  className="absolute inset-0 rounded-xl bg-arena-50"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={18} className="relative" aria-hidden="true" />
            </Link>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 translate-y-1.5 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white opacity-0 transition-all duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
            >
              {label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
