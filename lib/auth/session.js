import "server-only";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { getAuth } from "./auth";
import { homeFor } from "./routes";

/**
 * Resolves the signed-in user for the current request (deduplicated per request).
 * Returns null when signed out or in demo mode.
 * Shape: { user: { id, name, email, image, role }, profile } where profile is a plain object.
 */
export const getCurrentUser = cache(async () => {
  // Read the request first, always: this is what makes signed-in pages render
  // per request. Returning early without it (e.g. a build with no database
  // settings) would let Next.js prerender a "signed out" page and serve it to everyone.
  const requestHeaders = await headers();
  const auth = getAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user || session.user.banned) return null; // suspended accounts are treated as signed out

  await connectToDatabase();
  const profile = await Profile.findOne({ userId: new ObjectId(session.user.id) }).lean();
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      role: session.user.role ?? "student",
    },
    profile: profile ? JSON.parse(JSON.stringify(profile)) : null,
  };
});

/**
 * For pages: redirect to /login when signed out, and to /onboarding until the
 * one-time setup is done. Pass `onboarding: true` on the onboarding page itself.
 */
export async function requireUser({ next = "/continue", onboarding = false } = {}) {
  const current = await getCurrentUser();
  if (!current) redirect(`/login?next=${encodeURIComponent(next)}`);
  const done = Boolean(current.profile?.onboardingComplete);
  if (!onboarding && !done) redirect("/onboarding");
  if (onboarding && done) redirect(homeFor(current.user.role));
  return current;
}

/** For pages restricted to some roles; other signed-in users go to their own home. */
export async function requireRole(roles, options) {
  const current = await requireUser(options);
  if (!roles.includes(current.user.role)) redirect(homeFor(current.user.role));
  return current;
}
