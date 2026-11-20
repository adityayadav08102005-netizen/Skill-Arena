import { NextResponse } from "next/server";
import { parseJson, requireApiUser } from "@/lib/auth/guards";
import { assessmentErrorResponse } from "@/lib/assessments/routeHelpers";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { saveSchema } from "@/lib/validations/assessments";
import { saveAnswers } from "@/services/assessments";

/** PATCH /api/assessments/attempts/:id — autosave answers and flags while the timer runs. */
export async function PATCH(request, { params }) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;
  const limited = await limitOrNull(`assess-save:${user.id}`, { limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const { data, response: invalid } = await parseJson(request, saveSchema);
  if (invalid) return invalid;
  const { id } = await params;
  try {
    return NextResponse.json(await saveAnswers(user, id, data));
  } catch (error) {
    return assessmentErrorResponse(error, "Couldn't save your answers.");
  }
}
