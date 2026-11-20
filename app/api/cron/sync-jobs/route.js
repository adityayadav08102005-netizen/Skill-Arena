import { timingSafeEqual } from "node:crypto";
import { NextResponse, connection } from "next/server";
import { apiError } from "@/lib/auth/guards";
import { syncCodeforcesProblems, cfProblemsDue } from "@/services/codeforcesProblems";
import { ensureScheduledContests } from "@/services/contestScheduler";
import { refreshExternalContests } from "@/services/externalContests";
import { syncDueSources } from "@/services/jobSync";

export const maxDuration = 60;

/**
 * For a scheduler (e.g. Vercel Cron): syncs the job boards that are due and
 * creates the upcoming weekly contests, and refreshes other platforms' contest
 * calendars and the Codeforces problem set.
 * Needs "Authorization: Bearer <CRON_SECRET>"; disabled when CRON_SECRET isn't set.
 */
export async function GET(request) {
  await connection(); // always run at request time, never prerendered at build
  const secret = process.env.CRON_SECRET;
  if (!secret) return apiError(404, "Not found.");
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return apiError(401, "Unauthorized.");
  const jobs = await syncDueSources({ trigger: "cron" });
  const contests = await ensureScheduledContests();
  const calendars = await refreshExternalContests();
  const codeforcesProblems = (await cfProblemsDue()) ? await syncCodeforcesProblems() : { skipped: "fresh" };
  return NextResponse.json({ ...jobs, scheduledContests: contests, calendars, codeforcesProblems });
}
