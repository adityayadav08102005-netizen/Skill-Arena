import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { OpportunityError, setSaved } from "@/services/opportunities";

/** POST saves an opportunity, DELETE unsaves it. Students only. */
async function handle(request, params, saved) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;
  const limited = await limitOrNull(`save:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  try {
    return NextResponse.json(await setSaved(user, id, saved));
  } catch (error) {
    if (error instanceof OpportunityError) return apiError(error.status, error.message);
    console.error("save failed", error);
    return apiError(500, "Couldn't update your saved list.");
  }
}

export const POST = (request, { params }) => handle(request, params, true);
export const DELETE = (request, { params }) => handle(request, params, false);
