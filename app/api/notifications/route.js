import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, requireApiUser } from "@/lib/auth/guards";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { listNotifications, markRead } from "@/services/notifications";

/** GET /api/notifications — your latest notifications and unread count. */
export async function GET(request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  return NextResponse.json(await listNotifications(user.id), { headers: { "Cache-Control": "no-store" } });
}

const readSchema = z.object({ ids: z.array(z.string().max(40)).max(100).optional() }).strict();

/** POST /api/notifications — mark some ({ ids }) or all ({}) of your notifications as read. */
export async function POST(request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  const limited = await limitOrNull(`notifications:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { data, response: invalid } = await parseJson(request, readSchema);
  if (invalid) return invalid;
  const updated = await markRead(user.id, data.ids);
  return NextResponse.json({ updated });
}
