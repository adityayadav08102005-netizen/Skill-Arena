import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const VARIANTS = {
  primary: "border-arena-600 bg-arena-600 text-white before:bg-ink",
  outline: "border-arena-600 text-arena-600 hover:text-white before:bg-arena-600",
  bridge: "border-bridge-600 bg-bridge-600 text-white before:bg-bridge-800",
  ghost: "border-line bg-panel text-ink before:bg-arena-50",
};

const SIZES = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

/**
 * Pill button whose fill slides in from the left on hover.
 * Renders a Next link for routes, a plain anchor for in-page `#` links,
 * and a <button> when no href is given.
 */
export default function SlideButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) {
  const classes = cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border font-medium",
    "transition-colors duration-300",
    "before:absolute before:inset-0 before:-translate-x-[101%] before:transition-transform before:duration-400 before:ease-snap",
    "hover:before:translate-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arena-400",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  const inner = <span className="relative inline-flex items-center gap-2">{children}</span>;

  if (!href) {
    return (
      <button type="button" className={classes} {...props}>
        {inner}
      </button>
    );
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} className={classes} {...props}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {inner}
    </Link>
  );
}
