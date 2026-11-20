import { NextResponse } from "next/server";
import { apiError, parseJson, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { PROFILE_SECTIONS } from "@/lib/validations/profile";
import { ProfileError, updateProfileSection } from "@/services/profiles";

/**
 * PATCH /api/profile/:section — update one section of your own profile.
 * Sections: basics, skills, education, experience, projects, privacy.
 */
export async function PATCH(request, { params }) {
  const { section } = await params;
  const schema = PROFILE_SECTIONS[section];
  if (!schema) return apiError(404, "Unknown profile section.");

  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const limited = await limitOrNull(`profile:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { data, response: invalid } = await parseJson(request, schema);
  if (invalid) return invalid;

  try {
    const result = await updateProfileSection(user, section, data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProfileError) return apiError(error.status, error.message);
    if (error?.name === "ValidationError") return apiError(422, Object.values(error.errors)[0]?.message ?? "Some fields are invalid.");
    console.error("profile update failed", error);
    return apiError(500, "Couldn't save your changes. Try again.");
  }
}
