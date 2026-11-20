import "server-only";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { getAuth } from "./auth";

/** JSON error helper used by every Route Handler, so errors look the same everywhere. */
export function apiError(status, message, details) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

/**
 * Resolves the user behind an API request. Returns { user } or { response }
 * where `response` is the error to return as-is (503 demo mode, 401, 403).
 *
 *   const { user, response } = await requireApiUser(request, { roles: ["student"] });
 *   if (response) return response;
 */
export async function requireApiUser(request, { roles } = {}) {
  if (!isDatabaseConfigured()) {
    return { response: apiError(503, "This action needs a connected database. The site is in demo mode.") };
  }
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return { response: apiError(401, "Sign in to continue.") };
  if (session.user.banned) return { response: apiError(403, "This account is suspended.") };
  const user = { ...session.user, role: session.user.role ?? "student" };
  if (roles && !roles.includes(user.role)) {
    return { response: apiError(403, "You don't have access to this action.") };
  }
  return { user };
}

/** The signed-in user for an API request, or null (never an error). For public endpoints that personalise. */
export async function optionalApiUser(request) {
  if (!isDatabaseConfigured()) return null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user && !session.user.banned ? { ...session.user, role: session.user.role ?? "student" } : null;
}

/** Parse a JSON body with a zod schema; returns { data } or { response }. */
export async function parseJson(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { response: apiError(400, "Send a valid JSON body.") };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return { response: apiError(422, details[0]?.message ?? "Some fields are invalid.", details) };
  }
  return { data: result.data };
}
