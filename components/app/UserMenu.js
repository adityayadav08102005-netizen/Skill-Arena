"use client";

import { AnimatePresence, motion } from "motion/react";
import { Briefcase, ChevronDown, Eye, LayoutDashboard, LogOut, Settings, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import Avatar from "./Avatar";

const ROLE_LABEL = { student: "Student", recruiter: "Recruiter", admin: "Admin" };

/** Avatar button in the top bar with a small menu: profile, settings, sign out. */
export default function UserMenu({ user, hasAvatar }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-line bg-panel py-1 pl-1 pr-3 text-sm transition-shadow hover:shadow-float"
      >
        <Avatar userId={user.id} name={user.name} hasAvatar={hasAvatar} image={user.image} size="sm" />
        <span className="hidden max-w-36 truncate sm:inline">{user.name}</span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-panel p-1.5 shadow-float"
          >
            <div className="px-3 py-2">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
              <span className="mt-1 inline-block rounded-full bg-arena-50 px-2 py-0.5 text-[11px] text-arena-800">{ROLE_LABEL[user.role]}</span>
            </div>
            {user.role === "student" && (
              <MenuLink href="/dashboard" icon={LayoutDashboard} onClick={() => setOpen(false)}>Dashboard</MenuLink>
            )}
            {user.role === "recruiter" && (
              <MenuLink href="/recruiter" icon={Briefcase} onClick={() => setOpen(false)}>Recruiter portal</MenuLink>
            )}
            {user.role === "admin" && (
              <MenuLink href="/admin" icon={ShieldCheck} onClick={() => setOpen(false)}>Admin console</MenuLink>
            )}
            <MenuLink href="/profile" icon={User} onClick={() => setOpen(false)}>Edit profile</MenuLink>
            <MenuLink href={`/u/${user.id}`} icon={Eye} onClick={() => setOpen(false)}>Public profile</MenuLink>
            <MenuLink href="/settings" icon={Settings} onClick={() => setOpen(false)}>Settings</MenuLink>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger-600 transition-colors hover:bg-danger-50"
            >
              <LogOut size={15} aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ href, icon: Icon, children, onClick }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-[background-color,padding] duration-200 hover:bg-page hover:pl-4">
      <Icon size={15} className="text-muted" aria-hidden="true" /> {children}
    </Link>
  );
}
