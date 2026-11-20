import { cn } from "@/lib/utils/cn";

/** Endless horizontal scroller. Children are rendered twice for a seamless loop. */
export default function Marquee({ children, seconds = 24, className }) {
  return (
    <div className={cn("overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]", className)}>
      <div
        className="flex w-max gap-10 hover:[animation-play-state:paused]"
        style={{ animation: `sa-marquee ${seconds}s linear infinite` }}
      >
        <div className="flex shrink-0 gap-10">{children}</div>
        <div className="flex shrink-0 gap-10" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
