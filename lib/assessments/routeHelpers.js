import "server-only";
import { apiError } from "@/lib/auth/guards";
import { AssessmentError } from "@/services/assessments";

export function assessmentErrorResponse(error, fallback) {
  if (error instanceof AssessmentError) return apiError(error.status, error.message);
  console.error(fallback, error);
  return apiError(500, fallback);
}
