import { NextResponse } from "next/server";
import { apiError, parseJson, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { reportSchema } from "@/lib/validations/admin";
import { AdminError, createReport } from "@/services/admin";

/** Any signed-in user can report a listing, profile, problem or question they've seen. */
export async function POST(request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  const parsed = await parseJson(request, reportSchema);
  if (parsed.response) return parsed.response;
  const limited = await limitOrNull(`report:${user.id}`, { limit: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    return NextResponse.json(await createReport(user, parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof AdminError) return apiError(error.status, error.message);
    console.error("report failed", error);
    return apiError(500, "Couldn't send the report. Try again.");
  }
}
