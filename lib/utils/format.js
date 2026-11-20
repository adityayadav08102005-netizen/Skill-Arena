import { EXPERIENCE_LEVELS, OPPORTUNITY_TYPES, WORK_MODES } from "@/data/opportunities";

/** Labels for opportunity enums, shared by every SkillBridge screen. */
export const TYPE_LABEL = Object.fromEntries(OPPORTUNITY_TYPES.map((t) => [t.key, t.label]));
export const MODE_LABEL = Object.fromEntries(WORK_MODES.map((t) => [t.key, t.label]));
export const EXPERIENCE_LABEL = Object.fromEntries(EXPERIENCE_LEVELS.map((t) => [t.key, t.label]));
export const SOURCE_LABEL = { manual: "SkillArena", remotive: "Remotive", arbeitnow: "Arbeitnow", himalayas: "Himalayas", jobicy: "Jobicy", adzuna: "Adzuna" };

const compact = (n) => (n >= 100_000 ? `${(n / 100_000).toFixed(n % 100_000 ? 1 : 0)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/** "₹25k–30k/mo", "₹4.2L–4.5L/yr", "₹300/hr" … or null when there is no salary. */
export function formatSalary(salary) {
  if (!salary || salary.min == null) return null;
  const symbol = salary.currency === "USD" ? "$" : salary.currency === "EUR" ? "€" : "₹";
  const per = { month: "/mo", year: "/yr", hour: "/hr", total: " total" }[salary.period] ?? "";
  const range = salary.max == null || salary.min === salary.max ? compact(salary.min) : `${compact(salary.min)}–${compact(salary.max)}`;
  return `${symbol}${range}${per}`;
}
