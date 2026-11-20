import { Compass } from "lucide-react";
import Reveal from "@/components/common/Reveal";
import SlideButton from "@/components/common/SlideButton";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24 text-center">
      <Reveal>
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-arena-50 text-arena-600">
          <Compass size={26} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-medium tracking-tight">This page isn&apos;t here</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          The link may be wrong, or the profile is private.
        </p>
        <SlideButton href="/" className="mt-6">
          Back to SkillArena
        </SlideButton>
      </Reveal>
    </div>
  );
}
