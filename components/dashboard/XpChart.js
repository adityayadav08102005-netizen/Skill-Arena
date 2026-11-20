"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmtDay = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtNum = (n) => (n >= 10_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("en-IN"));

function XpTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 text-xs shadow-float">
      <div className="text-muted">{fmtDay(point.day)}</div>
      <div className="mt-0.5 font-medium text-ink">{point.total.toLocaleString("en-IN")} XP total</div>
      <div className="text-muted">{point.gained ? `+${point.gained} that day` : "No XP that day"}</div>
    </div>
  );
}

/** Cumulative XP over the last 30 days: one series, so no legend; crosshair tooltip on hover. */
export default function XpChart({ series }) {
  const last = series.at(-1);
  return (
    <div className="h-44 w-full" role="img" aria-label={`XP over the last 30 days, now ${last?.total ?? 0}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--sa-arena-600)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--sa-arena-600)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--sa-line)" />
          <XAxis
            dataKey="day"
            tickFormatter={fmtDay}
            interval={6}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--sa-muted)" }}
          />
          <YAxis tickFormatter={fmtNum} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--sa-muted)" }} allowDecimals={false} />
          <Tooltip content={<XpTooltip />} cursor={{ stroke: "var(--sa-arena-300)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--sa-arena-600)"
            strokeWidth={2}
            fill="url(#xpFill)"
            activeDot={{ r: 5, stroke: "var(--sa-panel)", strokeWidth: 2, fill: "var(--sa-arena-600)" }}
            animationDuration={1100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
