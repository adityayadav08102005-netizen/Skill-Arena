import "server-only";
import { NextResponse } from "next/server";
import { apiError, parseJson, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { AdminError } from "@/services/admin";

/**
 * Wraps an admin-only Route Handler: role check on the server, rate limit,
 * optional JSON schema, and consistent error responses.
 *   export const POST = adminRoute(async ({ user, data, params }) => …, { schema })
 * `bucket` gives a route its own rate-limit counter (e.g. a stricter limit for slow actions).
 */
export function adminRoute(handler, { schema, limit = 120, bucket = "default" } = {}) {
  return async (request, { params } = {}) => {
    const { user, response } = await requireApiUser(request, { roles: ["admin"] });
    if (response) return response;
    const limited = await limitOrNull(`admin:${bucket}:${user.id}`, { limit, windowMs: 60_000 });
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
      if (error instanceof AdminError) return apiError(error.status, error.message);
      if (error?.name === "ValidationError") return apiError(422, Object.values(error.errors)[0]?.message ?? "Some fields are invalid.");
      console.error("admin action failed", error);
      return apiError(500, "Something went wrong. Try again.");
    }
  };
}
