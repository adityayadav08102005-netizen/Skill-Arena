import { NextResponse } from "next/server";
import { apiError, optionalApiUser } from "@/lib/auth/guards";
import { contestErrorResponse } from "@/lib/contests/routeHelpers";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { getStandings } from "@/services/contests";

/** GET /api/contests/:slug/standings — public ranked standings (plus your own row when signed in). */
export async function GET(request, { params }) {
  if (!isDatabaseConfigured()) return apiError(503, "Contests need a connected database.");
  const user = await optionalApiUser(request);
  const limited = await limitOrNull(`standings:${user?.id ?? request.headers.get("x-forwarded-for") ?? "anon"}`, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { slug } = await params;
  try {
    return NextResponse.json(await getStandings(slug, user?.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return contestErrorResponse(error, "Couldn't load the standings.");
  }
}
