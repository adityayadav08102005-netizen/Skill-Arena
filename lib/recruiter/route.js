import "server-only";
import { NextResponse } from "next/server";
import { apiError, parseJson, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { RecruiterError } from "@/services/recruiter";

/**
 * Wraps a recruiter-only Route Handler: role check, rate limit, optional JSON
 * schema, and consistent error responses.
 *   export const POST = recruiterRoute(async ({ user, data, params }) => …, { schema })
 */
export function recruiterRoute(handler, { schema, limit = 60 } = {}) {
  return async (request, { params } = {}) => {
    const { user, response } = await requireApiUser(request, { roles: ["recruiter"] });
    if (response) return response;
    const limited = await limitOrNull(`recruiter:${user.id}`, { limit, windowMs: 60_000 });
    if (limited) return limited;
    let data;
    if (schema) {
      const parsed = await parseJson(request, schema);
      if (parsed.response) return parsed.response;
      data = parsed.data;
    }
    try {
      const result = await handler({ user, data, params: params ? await params : {}, request });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (error) {
      if (error instanceof RecruiterError) return apiError(error.status, error.message);
      if (error?.name === "ValidationError") return apiError(422, Object.values(error.errors)[0]?.message ?? "Some fields are invalid.");
      console.error("recruiter action failed", error);
      return apiError(500, "Something went wrong. Try again.");
    }
  };
}
