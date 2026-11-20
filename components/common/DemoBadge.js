import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Marks content that comes from SkillArena's built-in sample data rather than
 * real user data or a live API. Render it wherever demo data is shown.
 */
export default function DemoBadge({ label = "Demo data", className }) {
  return (
    <span
      title="Sample data shipped with SkillArena. Connect Supabase to see real data."
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-xp-50 px-2.5 py-0.5 text-[11px] text-xp-800",
        className,
      )}
    >
      <FlaskConical size={12} aria-hidden="true" />
      {label}
    </span>
  );
}
