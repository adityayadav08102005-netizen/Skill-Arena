/**
 * Calendar-day handling for streaks, heatmaps and daily challenges.
 * Days are counted in one platform time zone (default India Standard Time,
 * since SkillArena targets Indian colleges), so "today" is the same for
 * everyone and the server and charts agree.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Kolkata";

const keyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** "YYYY-MM-DD" for the calendar day `date` falls on in the platform time zone. */
export function dayKey(date = new Date()) {
  return keyFormatter.format(date);
}

/** Day key `n` days before the given day key (n may be negative). Calendar arithmetic, no time zone drift. */
export function shiftDay(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - n));
  return t.toISOString().slice(0, 10);
}

/** Inclusive list of day keys ending at `endKey`, oldest first. */
export function lastDays(count, endKey = dayKey()) {
  return Array.from({ length: count }, (_, i) => shiftDay(endKey, count - 1 - i));
}

/** "+05:30"-style UTC offset of the platform time zone at `date`. */
function zoneOffset(date) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-]\d{2}:\d{2})/.exec(part ?? "");
  return m ? m[1] : "+00:00";
}

/** The instant a platform calendar day (YYYY-MM-DD) begins. */
export function dayStart(key) {
  return new Date(`${key}T00:00:00${zoneOffset(new Date(`${key}T12:00:00Z`))}`);
}

/** Monday of the platform week containing `key`. */
export function weekStartKey(key = dayKey()) {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDay(key, (dow + 6) % 7);
}

/** First day of the platform month containing `key`. */
export function monthStartKey(key = dayKey()) {
  return `${key.slice(0, 8)}01`;
}

/** ISO instant when the next platform day starts (daily challenge reset). */
export function nextDayStart(now = new Date()) {
  const tomorrow = shiftDay(dayKey(now), -1);
  return new Date(`${tomorrow}T00:00:00${zoneOffset(now)}`).toISOString();
}

export function relativeTime(date, now = new Date()) {
  const diff = (new Date(date).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}
