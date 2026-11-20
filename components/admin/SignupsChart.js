"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmtWeek = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const SERIES = [
  { key: "students", label: "Students", color: "var(--sa-arena-600)" },
  { key: "recruiters", label: "Recruiters", color: "var(--sa-bridge-600)" },
];

function WeekTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 text-xs shadow-float">
      <div className="text-muted">Week of {fmtWeek(p.week)}</div>
      {SERIES.map((s) => (
        <div key={s.key} className="mt-0.5 flex items-center gap-1.5 text-ink">
          <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden="true" /> {p[s.key]} {s.label.toLowerCase()}
        </div>
      ))}
    </div>
  );
}

/** New accounts per week, stacked by role; legend above, tooltip per bar, table fallback for screen readers. */
export default function SignupsChart({ data }) {
  const total = data.reduce((s, d) => s + d.students + d.recruiters, 0);
  return (
    <div>
      <ul className="mb-2 flex gap-3 text-xs text-muted" aria-hidden="true">
        {SERIES.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
          </li>
        ))}
      </ul>
      <div className="h-48 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--sa-line)" />
            <XAxis dataKey="week" tickFormatter={fmtWeek} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--sa-muted)" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: "var(--sa-muted)" }} />
            <Tooltip content={<WeekTooltip />} cursor={{ fill: "var(--sa-page)" }} />
            <Bar dataKey="students" stackId="a" fill="var(--sa-arena-600)" stroke="var(--sa-panel)" strokeWidth={2} animationDuration={900} />
            <Bar dataKey="recruiters" stackId="a" fill="var(--sa-bridge-600)" stroke="var(--sa-panel)" strokeWidth={2} radius={[4, 4, 0, 0]} animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>New accounts per week, {total} in total</caption>
        <thead>
          <tr><th>Week of</th><th>Students</th><th>Recruiters</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.week}><td>{fmtWeek(d.week)}</td><td>{d.students}</td><td>{d.recruiters}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
