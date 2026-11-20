import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { ApplicationError, applyToOpportunity } from "@/services/applications";

/**
 * POST /api/opportunities/:id/apply (multipart form, students only)
 *   resumeChoice: "profile" | "upload"
 *   file:         the resume when resumeChoice is "upload"
 *   coverLetter:  optional, up to 4,000 characters
 */
export async function POST(request, { params }) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;
  const limited = await limitOrNull(`apply:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  let form;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "Send the application as multipart form data.");
  }
  const resumeChoice = form.get("resumeChoice");
  const coverLetter = String(form.get("coverLetter") ?? "").trim();
  if (!["profile", "upload"].includes(resumeChoice)) return apiError(422, "Choose your profile resume or upload one.");
  if (coverLetter.length > 4000) return apiError(422, "Keep the cover letter under 4,000 characters.");
  const file = resumeChoice === "upload" ? form.get("file") : null;
  if (resumeChoice === "upload" && (!file || typeof file === "string")) return apiError(422, "Attach your resume file.");

  const { id } = await params;
  try {
    return NextResponse.json(await applyToOpportunity(user, id, { coverLetter, resumeChoice, file }), { status: 201 });
  } catch (error) {
    if (error instanceof ApplicationError) return apiError(error.status, error.message);
    console.error("apply failed", error);
    return apiError(500, "Couldn't send your application. Try again.");
  }
}
