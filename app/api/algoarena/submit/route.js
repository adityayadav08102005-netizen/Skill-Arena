import { NextResponse } from "next/server";
import { apiError, parseJson, requireApiUser } from "@/lib/auth/guards";
import { ExecutionUnavailableError } from "@/lib/execution/engine";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { submitSchema } from "@/lib/validations/algoarena";
import { SubmissionError, submitSolution } from "@/services/submissions";

// Judging can take a while (several tests through Judge0); allow up to a minute on serverless hosts.
export const maxDuration = 60;

/**
 * POST /api/algoarena/submit — judge against sample and hidden tests, store
 * the submission, and apply XP / daily-challenge / streak rewards on the server.
 * Students only.
 */
export async function POST(request) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;

  const limited = await limitOrNull(`submit:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { data, response: invalid } = await parseJson(request, submitSchema);
  if (invalid) return invalid;

  try {
    return NextResponse.json(await submitSolution(user, data));
  } catch (error) {
    if (error instanceof SubmissionError || error instanceof ExecutionUnavailableError) return apiError(error.status, error.message);
    console.error("submit failed", error);
    return apiError(500, "Couldn't submit your code. Try again.");
  }
}
