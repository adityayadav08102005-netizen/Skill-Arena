import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { assessmentErrorResponse } from "@/lib/assessments/routeHelpers";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { submitAttempt } from "@/services/assessments";

/** POST /api/assessments/attempts/:id/submit — score the attempt on the server (idempotent). */
export async function POST(request, { params }) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;
  const limited = await limitOrNull(`assess-submit:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  try {
    return NextResponse.json(await submitAttempt(user, id));
  } catch (error) {
    return assessmentErrorResponse(error, "Couldn't submit the assessment.");
  }
}
