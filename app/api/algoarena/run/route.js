import { NextResponse } from "next/server";
import { apiError, parseJson, requireApiUser } from "@/lib/auth/guards";
import { ExecutionUnavailableError, isExecutionConfigured } from "@/lib/execution/engine";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { runSchema } from "@/lib/validations/algoarena";
import { SubmissionError, runCode } from "@/services/submissions";

// Judging can take a while (several tests through Judge0); allow up to a minute on serverless hosts.
export const maxDuration = 60;

/**
 * POST /api/algoarena/run — run code on the sample tests (or custom input).
 * With a code runner configured this needs a signed-in user (it spends
 * runner quota). In demo mode nothing executes, so anyone may call it.
 */
export async function POST(request) {
  let key = `run:ip:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`;
  if (isExecutionConfigured()) {
    const { user, response } = await requireApiUser(request);
    if (response) return response;
    key = `run:${user.id}`;
  }
  const limited = await limitOrNull(key, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { data, response: invalid } = await parseJson(request, runSchema);
  if (invalid) return invalid;

  try {
    return NextResponse.json(await runCode(data));
  } catch (error) {
    if (error instanceof SubmissionError || error instanceof ExecutionUnavailableError) return apiError(error.status, error.message);
    console.error("run failed", error);
    return apiError(500, "Couldn't run your code. Try again.");
  }
}
