import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ACCENT_BORDER = {
  arena: "hover:border-arena-300",
  bridge: "hover:border-bridge-200",
  xp: "hover:border-xp-200",
};

/**
 * White card that lifts on hover, tints its border and slides an arrow in.
 * Pass `href` to make the whole card a link; `accent` picks the hover tint.
 */
export default function HoverCard({ href, accent = "arena", className, children, showArrow = Boolean(href) }) {
  const classes = cn(
    "group relative block overflow-hidden rounded-card border border-line bg-panel p-4",
    "transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1",
    ACCENT_BORDER[accent] ?? ACCENT_BORDER.arena,
    className,
  );
  const arrow = showArrow ? (
    <ArrowRight
      size={16}
      aria-hidden="true"
      className={cn(
        "absolute bottom-3 right-3 translate-x-6 opacity-0 transition-all duration-300 ease-snap group-hover:translate-x-0 group-hover:opacity-100",
        accent === "bridge" ? "text-bridge-600" : "text-arena-600",
      )}
    />
  ) : null;

  if (href) {
    const Tag = href.startsWith("#") ? "a" : Link;
    return (
      <Tag href={href} className={classes}>
        {children}
        {arrow}
      </Tag>
    );
  }
  return (
    <div className={classes}>
      {children}
      {arrow}
    </div>
  );
}
