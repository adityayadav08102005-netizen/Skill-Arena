import "server-only";
import { ExternalApiError } from "@/lib/api/http";
import { fetchCodeforcesProblemset } from "@/lib/api/providers";
import { connectToDatabase } from "@/lib/db/mongoose";
import { CfProblem, ExternalCache } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

/**
 * The Codeforces problem set (names, ratings, tags, solve counts, links),
 * stored in cf_problems and refreshed once a day. Problems are solved on
 * Codeforces; SkillArena only helps students find the right ones.
 */
const META = "cf:problemset";
const MAX_AGE_MS = 24 * 3_600_000;
const PAGE = 30;
const SORTS = { solved: { solvedCount: -1, contestId: -1 }, newest: { contestId: -1, index: 1 }, easiest: { rating: 1, solvedCount: -1 }, hardest: { rating: -1, solvedCount: -1 } };

export async function cfProblemsDue() {
  if (!isDatabaseConfigured()) return false;
  await connectToDatabase();
  const meta = await ExternalCache.findOne({ key: META }, { fetchedAt: 1, attemptedAt: 1 }).lean();
  if (meta?.attemptedAt && Date.now() - new Date(meta.attemptedAt) < 10 * 60_000 && !meta.fetchedAt) return false; // first sync running
  return !meta?.fetchedAt || Date.now() - new Date(meta.fetchedAt) > MAX_AGE_MS;
}

/** Download and upsert the whole problem set. Locked for 10 minutes so only one sync runs. */
export async function syncCodeforcesProblems() {
  if (!isDatabaseConfigured()) return { skipped: "demo" };
  await connectToDatabase();
  const now = new Date();
  const claimed = await ExternalCache.findOneAndUpdate(
    { key: META, $or: [{ attemptedAt: null }, { attemptedAt: { $lt: new Date(now - 10 * 60_000) } }] },
    { $set: { attemptedAt: now } },
  ).lean();
  if (!claimed) {
    try {
      await ExternalCache.create({ key: META, attemptedAt: now });
    } catch (error) {
      if (error?.code === 11000) return { skipped: "running" };
      throw error;
    }
  }
  try {
    const problems = await fetchCodeforcesProblemset();
    if (!problems.length) throw new ExternalApiError("Codeforces", "bad_response", "Codeforces returned no problems.");
    for (let i = 0; i < problems.length; i += 1000) {
      await CfProblem.bulkWrite(
        problems.slice(i, i + 1000).map((p) => ({ updateOne: { filter: { key: p.key }, update: { $set: { ...p, seenAt: now } }, upsert: true } })),
        { ordered: false },
      );
    }
    await ExternalCache.updateOne({ key: META }, { $set: { fetchedAt: new Date(), error: null, data: { count: problems.length } } });
    return { ok: true, count: problems.length };
  } catch (error) {
    if (!(error instanceof ExternalApiError)) console.error("Codeforces problem sync failed", error);
    await ExternalCache.updateOne({ key: META }, { $set: { error: error.message?.slice(0, 300) ?? "failed" } });
    return { ok: false, error: error.message };
  }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parseCfFilters(params = {}) {
  const pick = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
  const num = (v) => (/^\d{3,4}$/.test(pick(v)) ? Number(pick(v)) : null);
  return {
    q: pick(params.q).trim().slice(0, 80),
    min: num(params.min),
    max: num(params.max),
    tag: pick(params.tag).trim().slice(0, 40),
    sort: Object.hasOwn(SORTS, pick(params.sort)) ? pick(params.sort) : "solved",
    page: Math.max(0, Math.min(200, Number.parseInt(pick(params.page), 10) || 0)),
  };
}

export async function listCfProblems({ q, min, max, tag, sort, page }) {
  if (!isDatabaseConfigured()) return { items: [], total: 0, hasMore: false, tags: [], syncedAt: null };
  await connectToDatabase();
  const filter = {};
  if (min || max) filter.rating = { ...(min ? { $gte: min } : {}), ...(max ? { $lte: max } : {}) };
  if (tag) filter.tags = tag;
  if (q) {
    const code = q.toUpperCase().match(/^(\d{1,4})([A-Z][0-9]?)$/);
    filter.$or = [{ name: { $regex: escapeRegex(q), $options: "i" } }, ...(code ? [{ key: `${code[1]}${code[2]}` }] : [])];
  }
  const [items, total, tags, meta] = await Promise.all([
    CfProblem.find(filter, { _id: 0, seenAt: 0 }).sort(SORTS[sort]).skip(page * PAGE).limit(PAGE).lean(),
    CfProblem.countDocuments(filter),
    CfProblem.distinct("tags"),
    ExternalCache.findOne({ key: META }, { fetchedAt: 1, error: 1 }).lean(),
  ]);
  return JSON.parse(JSON.stringify({ items, total, hasMore: (page + 1) * PAGE < total, tags: tags.sort(), syncedAt: meta?.fetchedAt ?? null, error: meta?.error ?? null }));
}
