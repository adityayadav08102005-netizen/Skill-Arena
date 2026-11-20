"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { APP_TIMEZONE } from "@/lib/utils/time";

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { timeZone: APP_TIMEZONE, day: "numeric", month: "short" });

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 text-xs shadow-float">
      <div className="font-medium text-ink">{p.title}</div>
      <div className="text-muted">{fmt(p.date)} · {p.percentage}% · {p.passed ? "passed" : "not passed"}</div>
    </div>
  );
}

/** Score per attempt over time (one series, so no legend), with the usual 60% pass line. */
export default function ScoreTrend({ points }) {
  const data = points.map((p, i) => ({ ...p, n: i + 1 }));
  return (
    <div className="h-48 w-full" role="img" aria-label={`Scores of your last ${data.length} attempts, latest ${data.at(-1)?.percentage ?? 0}%`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="var(--sa-line)" />
          <XAxis dataKey="n" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--sa-muted)" }} tickFormatter={(n) => `#${n}`} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--sa-muted)" }} />
          <ReferenceLine y={60} stroke="var(--sa-bridge-200)" strokeDasharray="0" label={{ value: "pass", position: "insideTopRight", fontSize: 10, fill: "var(--sa-muted)" }} />
          <Tooltip content={<Tip />} cursor={{ stroke: "var(--sa-bridge-200)" }} />
          <Line type="monotone" dataKey="percentage" stroke="var(--sa-bridge-400)" strokeWidth={2} dot={{ r: 4, fill: "var(--sa-bridge-400)", stroke: "var(--sa-panel)", strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={900} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
