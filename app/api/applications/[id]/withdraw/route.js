import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { ApplicationError, withdrawApplication } from "@/services/applications";

/** POST /api/applications/:id/withdraw — withdraw your own application while it's still open. */
export async function POST(request, { params }) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;
  const limited = await limitOrNull(`withdraw:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  try {
    return NextResponse.json(await withdrawApplication(user, id));
  } catch (error) {
    if (error instanceof ApplicationError) return apiError(error.status, error.message);
    console.error("withdraw failed", error);
    return apiError(500, "Couldn't withdraw the application.");
  }
}
