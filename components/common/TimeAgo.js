import { relativeTime } from "@/lib/utils/time";

/**
 * "5 minutes ago". Server and browser render this at slightly different
 * moments, so the text may legitimately differ; suppressHydrationWarning tells
 * React that's expected (the browser's value wins).
 */
export default function TimeAgo({ date, className }) {
  if (!date) return null;
  const d = new Date(date);
  return (
    <time dateTime={d.toISOString()} title={d.toLocaleString("en-IN")} className={className} suppressHydrationWarning>
      {relativeTime(d)}
    </time>
  );
}
