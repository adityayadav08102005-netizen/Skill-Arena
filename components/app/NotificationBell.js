"use client";

import { AnimatePresence, motion } from "motion/react";
import { Award, Bell, Briefcase, CalendarClock, ClipboardCheck, Flame, Info, Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { relativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

const ICONS = {
  application_status: Briefcase,
  new_application: Briefcase,
  new_opportunity: Briefcase,
  contest_reminder: CalendarClock,
  assessment_result: ClipboardCheck,
  achievement: Award,
  streak_milestone: Flame,
  level_up: TrendingUp,
  system: Info,
};

/** Bell in the top bar: unread badge, dropdown list, marks everything read once opened. */
export default function NotificationBell({ initialUnread }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items);
        setError("");
        if (data.unread > 0) {
          await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          if (!cancelled) setUnread(0);
        }
      } catch {
        if (!cancelled) setError("Couldn't load notifications.");
      }
    })();
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-full border border-line bg-panel text-muted transition-[color,box-shadow] hover:text-ink hover:shadow-float"
      >
        <motion.span animate={unread ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.6, repeat: unread ? 2 : 0, repeatDelay: 2 }}>
          <Bell size={16} aria-hidden="true" />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-medium text-white"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-1.5 shadow-float"
          >
            <div className="px-3 py-2 text-sm font-medium">Notifications</div>
            <div className="max-h-96 overflow-y-auto">
              {error && <p className="px-3 py-4 text-sm text-danger-600">{error}</p>}
              {!error && items === null && (
                <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading…
                </p>
              )}
              {items?.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>}
              <ul>
                {items?.map((n, i) => {
                  const Icon = ICONS[n.type] ?? Info;
                  const body = (
                    <>
                      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg", n.isRead ? "bg-page text-muted" : "bg-arena-50 text-arena-600")}>
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug">{n.title}</span>
                        {n.body && <span className="block text-xs text-muted">{n.body}</span>}
                        <span className="text-[11px] text-muted">{relativeTime(n.createdAt)}</span>
                      </span>
                    </>
                  );
                  const cls = "flex gap-2.5 rounded-xl px-3 py-2 transition-[background-color,padding] duration-200 hover:bg-page hover:pl-4";
                  return (
                    <motion.li key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => setOpen(false)} className={cls}>{body}</Link>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
