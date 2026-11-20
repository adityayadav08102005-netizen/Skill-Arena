import "server-only";
import { cacheLife } from "next/cache";
import { ASSESSMENT_CATEGORIES, assessments } from "@/data/assessments";
import { companies } from "@/data/demo/companies";
import { contests } from "@/data/demo/contests";
import { opportunities } from "@/data/opportunities";
import { problems } from "@/data/problems";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Assessment, Company, Contest, Opportunity, Problem } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

/**
 * Data for the public landing page: platform counts, the next contest, a
 * featured problem and opportunity, and company names for the marquee.
 * Demo mode reads the bundled sample data; database mode reads MongoDB and
 * caches the result for a few minutes.
 *
 * Contest timing is returned as `startsAt` (ISO) in database mode and as
 * `startsInHours` in demo mode, where the client counts from page load.
 */
export async function getLandingData() {
  return isDatabaseConfigured() ? getFromDatabase() : getFromDemo();
}

function shapeOpportunity(o) {
  return {
    id: String(o.id ?? o._id),
    title: o.title,
    companyName: o.companyName,
    workMode: o.workMode,
    location: o.location,
    requiredSkills: o.requiredSkills,
    salary: o.salary ?? null,
    source: o.source,
  };
}

function getFromDemo() {
  const upcoming = contests.filter((c) => c.startsInHours > 0).sort((a, b) => a.startsInHours - b.startsInHours)[0];
  const featured = problems.find((p) => p.slug === "two-sum");
  return {
    mode: "demo",
    counts: {
      problems: problems.length,
      openRoles: opportunities.length,
      assessmentTracks: assessments.length,
      companies: companies.length,
    },
    nextContest: upcoming
      ? { title: upcoming.title, startsInHours: upcoming.startsInHours, problemCount: upcoming.problems.length, durationMinutes: upcoming.durationMinutes }
      : null,
    featuredProblem: { title: featured.title, difficulty: featured.difficulty, topics: featured.topics, total: featured.samples.length + featured.hiddenTests.length },
    featuredOpportunity: shapeOpportunity(opportunities[0]),
    assessmentCategories: ASSESSMENT_CATEGORIES.map((c) => c.label),
    companyNames: companies.map((c) => c.name),
  };
}

async function getFromDatabase() {
  "use cache";
  cacheLife("minutes");

  await connectToDatabase();
  const now = new Date();
  const [problemCount, openRoles, assessmentCount, companyCount, upcoming, featured, opportunity, categories, companyDocs] =
    await Promise.all([
      Problem.countDocuments({ isPublished: true }),
      Opportunity.countDocuments({ status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: now } }] }),
      Assessment.countDocuments({ isPublished: true }),
      Company.countDocuments({}),
      Contest.findOne({ isPublished: true, startsAt: { $gt: now } }).sort({ startsAt: 1 }).lean(),
      Problem.findOne({ isPublished: true }).sort({ difficulty: 1, createdAt: 1 }).lean(),
      Opportunity.findOne({ status: "published" }).sort({ postedAt: -1 }).lean(),
      Assessment.distinct("category", { isPublished: true }),
      Company.find({}, { name: 1 }).limit(16).lean(),
    ]);

  const labelFor = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c.key, c.label]));
  return {
    mode: "database",
    counts: { problems: problemCount, openRoles, assessmentTracks: assessmentCount, companies: companyCount },
    nextContest: upcoming
      ? {
          title: upcoming.title,
          startsAt: upcoming.startsAt.toISOString(),
          problemCount: upcoming.problems.length,
          durationMinutes: Math.round((upcoming.endsAt - upcoming.startsAt) / 60_000),
        }
      : null,
    featuredProblem: featured
      ? { title: featured.title, difficulty: featured.difficulty, topics: featured.topics, total: featured.samples.length }
      : null,
    featuredOpportunity: opportunity ? shapeOpportunity(opportunity) : null,
    assessmentCategories: categories.map((c) => labelFor[c] ?? c),
    companyNames: [...new Set(companyDocs.map((c) => c.name))],
  };
}
