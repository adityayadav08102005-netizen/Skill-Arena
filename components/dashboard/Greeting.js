"use client";

import { useEffect, useState } from "react";

/** "Good morning/afternoon/evening" in the visitor's own time zone (so it runs on the client). */
export default function Greeting({ name }) {
  const [part, setPart] = useState(null);
  useEffect(() => {
    const h = new Date().getHours();
    const tick = setTimeout(() => setPart(h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"), 0);
    return () => clearTimeout(tick);
  }, []);
  const first = (name || "").split(/\s+/)[0];
  return <>{part ? `Good ${part}, ${first}` : `Welcome back, ${first}`}</>;
}
