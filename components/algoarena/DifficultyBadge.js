import { cn } from "@/lib/utils/cn";

const STYLES = {
  easy: "bg-bridge-50 text-bridge-800",
  medium: "bg-xp-50 text-xp-800",
  hard: "bg-danger-50 text-danger-800",
};

export default function DifficultyBadge({ difficulty, className }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] capitalize", STYLES[difficulty], className)}>
      {difficulty}
    </span>
  );
}
