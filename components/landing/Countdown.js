"use client";

import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

function format(ms) {
  if (ms <= 0) return "now";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return days > 0 ? `${days}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Live countdown to `startsAt` (ISO). In demo mode pass `startsInHours`
 * instead; the target is then counted from when the page loaded.
 * Renders a placeholder on the server so hydration never mismatches.
 */
export default function Countdown({ startsAt, startsInHours, className }) {
  const [label, setLabel] = useState("--:--:--");

  useEffect(() => {
    const target = startsAt ? Date.parse(startsAt) : Date.now() + startsInHours * 3_600_000;
    const tick = () => setLabel(format(target - Date.now()));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [startsAt, startsInHours]);

  return <span className={className}>{label}</span>;
}
