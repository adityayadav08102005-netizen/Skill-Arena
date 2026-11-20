import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { ExternalProfileError, refreshMine } from "@/services/externalProfiles";

/** POST refreshes your GitHub and Codeforces stats now (at most every 5 minutes). */
export async function POST(request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  try {
    return NextResponse.json(await refreshMine(user));
  } catch (error) {
    if (error instanceof ExternalProfileError) return apiError(error.status, error.message);
    console.error("external refresh failed", error);
    return apiError(500, "Couldn't refresh right now.");
  }
}
