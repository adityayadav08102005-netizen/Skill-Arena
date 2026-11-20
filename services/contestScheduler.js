import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Contest, Problem } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { SERIES, pickProblems, startOf, upcomingNumbers } from "@/lib/contests/schedule";

export { SERIES };

/** Creates any scheduled contests that don't exist yet. Returns the slugs created. */
export async function ensureScheduledContests({ now = Date.now() } = {}) {
  if (!isDatabaseConfigured()) return [];
  await connectToDatabase();
  const pool = await Problem.find({ isPublished: true }, { _id: 1, difficulty: 1 }).lean();
  const created = [];
  for (const series of SERIES) {
    for (const n of upcomingNumbers(series, now)) {
      const slug = series.slug(n);
      if (await Contest.exists({ slug })) continue;
      // Problem history is read per contest so back-to-back contests don't repeat problems.
      const history = await Contest.find({}, { problems: 1, startsAt: 1 }).sort({ startsAt: 1 }).lean();
      const lastUsed = new Map();
      for (const c of history) for (const p of c.problems) lastUsed.set(String(p.problemId), new Date(c.startsAt).getTime());
      const problems = pickProblems(series.slots, pool, lastUsed, n * 7919);
      if (problems.some((p) => !p)) continue; // not enough problems of some difficulty yet
      const startsAt = startOf(series, n);
      try {
        await Contest.create({
          slug,
          title: series.title(n),
          description: series.description,
          startsAt,
          endsAt: new Date(startsAt.getTime() + series.durationMinutes * 60_000),
          problems,
          penaltyMinutesPerWrong: series.penaltyMinutesPerWrong,
          isPublished: true,
        });
        created.push(slug);
      } catch (error) {
        if (error?.code !== 11000) throw error; // created by a parallel request: fine
      }
    }
  }
  return created;
}

/** Cheap check before scheduling from a page view: is any series missing an upcoming contest? */
export async function scheduleDue({ now = Date.now() } = {}) {
  if (!isDatabaseConfigured()) return false;
  await connectToDatabase();
  const wanted = SERIES.flatMap((s) => upcomingNumbers(s, now).map((n) => s.slug(n)));
  const existing = await Contest.countDocuments({ slug: { $in: wanted } });
  return existing < wanted.length;
}
