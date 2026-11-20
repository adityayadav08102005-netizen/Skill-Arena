import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { contestErrorResponse } from "@/lib/contests/routeHelpers";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { register, unregister } from "@/services/contests";

/** POST registers you for the contest (until it ends); DELETE unregisters (only before it starts). Students only. */
async function handle(request, params, action) {
  const { user, response } = await requireApiUser(request, { roles: ["student"] });
  if (response) return response;
  const limited = await limitOrNull(`contest-reg:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const { slug } = await params;
  try {
    return NextResponse.json(await action(user, slug));
  } catch (error) {
    return contestErrorResponse(error, "Couldn't update your registration. Try again.");
  }
}

export const POST = (request, { params }) => handle(request, params, register);
export const DELETE = (request, { params }) => handle(request, params, unregister);
