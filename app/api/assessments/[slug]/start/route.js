import { NextResponse } from "next/server";
import { parseJson, requireApiUser } from "@/lib/auth/guards";
import { assessmentErrorResponse } from "@/lib/assessments/routeHelpers";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { startSchema } from "@/lib/validations/assessments";
import { startAttempt } from "@/services/assessments";

/** POST /api/assessments/:slug/start — start (or resume) a timed attempt. Students only. */
export async function POST(request, { params }) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;
  const limited = await limitOrNull(`assess-start:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const { data, response: invalid } = await parseJson(request, startSchema);
  if (invalid) return invalid;
  const { slug } = await params;
  try {
    return NextResponse.json(await startAttempt(user, slug, data.difficulty));
  } catch (error) {
    return assessmentErrorResponse(error, "Couldn't start the assessment.");
  }
}
