import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { listMySubmissions } from "@/services/submissions";

/** GET /api/algoarena/submissions?problemId=… — your own submissions for a problem, with code. */
export async function GET(request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  const problemId = new URL(request.url).searchParams.get("problemId");
  if (!problemId || !ObjectId.isValid(problemId)) return apiError(400, "Pass a valid problemId.");
  const items = await listMySubmissions(user.id, problemId);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
