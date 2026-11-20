import Reveal from "@/components/common/Reveal";
import { cn } from "@/lib/utils/cn";

const ICON_TONE = {
  arena: "bg-arena-50 text-arena-600",
  bridge: "bg-bridge-50 text-bridge-600",
  xp: "bg-xp-50 text-xp-700",
};

const HOVER = {
  arena: "hover:border-arena-300",
  bridge: "hover:border-bridge-200",
  xp: "hover:border-xp-200",
};

/** Dashboard tile: reveals on scroll, lifts on hover, optional header with icon and a right-side slot. */
export default function DashCard({ title, icon: Icon, tone = "arena", action, delay = 0, className, children }) {
  return (
    <Reveal delay={delay} className={className}>
      <section
        className={cn(
          "h-full rounded-card border border-line bg-panel p-4 transition-[translate,border-color] duration-300 ease-snap hover:-translate-y-1",
          HOVER[tone],
        )}
      >
        {title && (
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-medium">
              {Icon && (
                <span className={cn("flex size-7 items-center justify-center rounded-lg", ICON_TONE[tone])}>
                  <Icon size={15} aria-hidden="true" />
                </span>
              )}
              {title}
            </h2>
            {action}
          </header>
        )}
        {children}
      </section>
    </Reveal>
  );
}

export function EmptyState({ children }) {
  return <p className="rounded-xl bg-page px-4 py-5 text-center text-sm text-muted">{children}</p>;
}

/** List row that slides right and tints on hover. */
export function Row({ children, className }) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-[padding,background-color] duration-200 hover:bg-page hover:pl-3.5",
        className,
      )}
    >
      {children}
    </li>
  );
}
