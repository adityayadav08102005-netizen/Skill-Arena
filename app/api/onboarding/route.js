import { NextResponse } from "next/server";
import { apiError, parseJson, requireApiUser } from "@/lib/auth/guards";
import { homeFor } from "@/lib/auth/routes";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { onboardingSchema } from "@/lib/validations/profile";
import { ProfileError, completeOnboarding } from "@/services/profiles";

/** POST /api/onboarding — one-time role choice (student or recruiter) and basic details. */
export async function POST(request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const limited = await limitOrNull(`onboarding:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { data, response: invalid } = await parseJson(request, onboardingSchema);
  if (invalid) return invalid;

  try {
    const { role } = await completeOnboarding(user, data);
    return NextResponse.json({ role, redirectTo: homeFor(role) });
  } catch (error) {
    if (error instanceof ProfileError) return apiError(error.status, error.message);
    console.error("onboarding failed", error);
    return apiError(500, "Couldn't finish setting up your account. Try again.");
  }
}
