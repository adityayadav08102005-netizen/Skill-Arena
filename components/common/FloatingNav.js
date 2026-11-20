"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Swords, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

function NavLink({ href, ...props }) {
  return href.startsWith("#") ? <a href={href} {...props} /> : <Link href={href} {...props} />;
}

/**
 * Floating pill navbar for public pages. A highlight slides under the hovered
 * link; on small screens the links collapse into a dropdown sheet.
 * `links` is [{ href, label }]; `cta` is { href, label }.
 */
export default function FloatingNav({ links, cta }) {
  const [hovered, setHovered] = useState(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <motion.nav
        aria-label="Main"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(
          "pointer-events-auto relative flex w-full items-center gap-1 rounded-full border border-line bg-panel/90 p-1.5 backdrop-blur-md transition-shadow duration-300 md:w-auto",
          scrolled ? "shadow-float" : "shadow-sm",
        )}
      >
        <Link href="/" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium">
          <Swords size={18} className="text-arena-600" aria-hidden="true" />
          SkillArena
        </Link>

        <ul className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {links.map((link) => (
            <li key={link.href} className="relative">
              <NavLink
                href={link.href}
                onMouseEnter={() => setHovered(link.href)}
                onFocus={() => setHovered(link.href)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "relative block rounded-full px-3 py-1.5 text-sm transition-colors duration-200",
                  hovered === link.href ? "text-arena-800" : "text-muted",
                )}
              >
                {hovered === link.href && (
                  <motion.span
                    layoutId="floating-nav-highlight"
                    className="absolute inset-0 rounded-full bg-arena-50"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {cta && (
          <NavLink
            href={cta.href}
            className="ml-1 hidden rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 md:inline-block"
          >
            {cta.label}
          </NavLink>
        )}

        <button
          type="button"
          className="ml-auto rounded-full p-2 text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full mt-2 rounded-card border border-line bg-panel p-2 shadow-float md:hidden"
            >
              {[...links, ...(cta ? [cta] : [])].map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <NavLink
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm hover:bg-arena-50"
                  >
                    {link.label}
                  </NavLink>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
