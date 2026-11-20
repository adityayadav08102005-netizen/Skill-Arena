import { Suspense } from "react";
import ProfileEditor from "@/components/profile/ProfileEditor";
import { requireUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Skill } from "@/lib/db/models";
import { profileCompletion } from "@/lib/utils/profileCompletion";

export const metadata = { title: "Your profile" };

async function Editor() {
  const { user, profile } = await requireUser({ next: "/profile" });
  await connectToDatabase();
  const skills = await Skill.find({}, { name: 1 }).sort({ name: 1 }).lean();
  return (
    <ProfileEditor
      user={user}
      profile={profile}
      completion={profileCompletion(profile, user)}
      skillOptions={skills.map((s) => s.name)}
    />
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-32 animate-pulse rounded-card bg-panel" />
      <div className="h-10 w-80 animate-pulse rounded-full bg-panel" />
      <div className="h-96 animate-pulse rounded-card bg-panel" />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor />
    </Suspense>
  );
}
