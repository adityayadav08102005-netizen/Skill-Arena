import { NextResponse } from "next/server";
import { parseJson, requireApiUser } from "@/lib/auth/guards";
import { contestErrorResponse } from "@/lib/contests/routeHelpers";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { contestRunSchema } from "@/lib/validations/algoarena";
import { getContestProblemRef } from "@/services/contests";
import { runCode } from "@/services/submissions";

// Judging can take a while (several tests through Judge0); allow up to a minute on serverless hosts.
export const maxDuration = 60;

/** POST /api/contests/:slug/run — run on sample tests; the problem must belong to a started contest. */
export async function POST(request, { params }) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  const limited = await limitOrNull(`run:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const { data, response: invalid } = await parseJson(request, contestRunSchema);
  if (invalid) return invalid;
  const { slug } = await params;
  try {
    await getContestProblemRef(slug, data.problemSlug); // 403 before start, 404 if not in this contest
    const { problemSlug, ...rest } = data;
    return NextResponse.json(await runCode({ slug: problemSlug, ...rest }, { allowUnpublished: true }));
  } catch (error) {
    return contestErrorResponse(error, "Couldn't run your code. Try again.");
  }
}
