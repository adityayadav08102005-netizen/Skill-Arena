"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function ScoreTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 text-xs shadow-float">
      <div className="font-medium text-ink">{p.label}</div>
      <div className="text-muted">Best score {p.best}%</div>
    </div>
  );
}

/** Best score per assessment category: horizontal bars, single hue, value at the bar tip. */
export default function AssessmentChart({ scores }) {
  const height = Math.max(120, scores.length * 34 + 16);
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={scores.map((s) => `${s.label} ${s.best}%`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={scores} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--sa-line)" />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--sa-muted)" }} />
          <YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--sa-ink)" }} />
          <Tooltip content={<ScoreTooltip />} cursor={{ fill: "var(--sa-bridge-50)" }} />
          <Bar dataKey="best" fill="var(--sa-bridge-400)" maxBarSize={18} radius={[0, 4, 4, 0]} animationDuration={900}>
            <LabelList dataKey="best" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: "var(--sa-muted)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
