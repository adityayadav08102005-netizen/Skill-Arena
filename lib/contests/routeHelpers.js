import "server-only";
import { apiError } from "@/lib/auth/guards";
import { ExecutionUnavailableError } from "@/lib/execution/judge0";
import { ContestError } from "@/services/contests";
import { SubmissionError } from "@/services/submissions";

/** Maps known service errors to JSON responses; logs and hides anything unexpected. */
export function contestErrorResponse(error, fallback) {
  if (error instanceof ContestError || error instanceof SubmissionError || error instanceof ExecutionUnavailableError) {
    return apiError(error.status, error.message);
  }
  console.error(fallback, error);
  return apiError(500, fallback);
}
