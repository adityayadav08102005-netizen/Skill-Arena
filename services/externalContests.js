import "server-only";
import { after } from "next/server";
import { ExternalApiError } from "@/lib/api/http";
import { fetchCodechefUpcoming, fetchCodeforcesUpcoming, fetchLeetcodeUpcoming } from "@/lib/api/providers";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ExternalCache } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

/**
 * Upcoming contests on other platforms, for the Contests page. Each platform
 * is cached separately (external_cache), refreshed after the page is sent
 * once it's 3 hours old, and kept when that platform is down.
 */
export const PLATFORMS = {
  codeforces: { label: "Codeforces", fetch: fetchCodeforcesUpcoming },
  leetcode: { label: "LeetCode", fetch: fetchLeetcodeUpcoming },
  codechef: { label: "CodeChef", fetch: fetchCodechefUpcoming },
};
const MAX_AGE_MS = 3 * 3_600_000;
const key = (platform) => `contests:${platform}`;

async function refresh(platform, { timeoutMs } = {}) {
  const now = new Date();
  // Claim the refresh so simultaneous page views don't all call the platform.
  const claimed = await ExternalCache.findOneAndUpdate(
    { key: key(platform), $or: [{ attemptedAt: null }, { attemptedAt: { $lt: new Date(now - 60_000) } }] },
    { $set: { attemptedAt: now } },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) {
    try {
      await ExternalCache.create({ key: key(platform), attemptedAt: now });
    } catch (error) {
      if (error?.code === 11000) return null;
      throw error;
    }
  }
  try {
    const job = PLATFORMS[platform].fetch();
    const data = await (timeoutMs ? Promise.race([job, new Promise((_, reject) => setTimeout(() => reject(new ExternalApiError(PLATFORMS[platform].label, "unavailable", "took too long")), timeoutMs))]) : job);
    return ExternalCache.findOneAndUpdate({ key: key(platform) }, { $set: { data, fetchedAt: new Date(), error: null } }, { returnDocument: "after" }).lean();
  } catch (error) {
    if (!(error instanceof ExternalApiError)) console.error(`${platform} contests refresh failed`, error);
    return ExternalCache.findOneAndUpdate({ key: key(platform) }, { $set: { error: error.message?.slice(0, 300) ?? "failed" } }, { returnDocument: "after" }).lean();
  }
}

/** Refresh every platform now (cron). */
export async function refreshExternalContests() {
  if (!isDatabaseConfigured()) return {};
  await connectToDatabase();
  const out = {};
  for (const platform of Object.keys(PLATFORMS)) {
    const doc = await refresh(platform);
    out[platform] = doc?.error ? { ok: false, error: doc.error } : { ok: true, count: doc?.data?.length ?? 0 };
  }
  return out;
}

/**
 * Upcoming contests from every platform, soonest first. A platform never
 * fetched before is fetched now (short timeout); stale ones refresh later.
 */
export async function getExternalContests({ limit = 24 } = {}) {
  if (!isDatabaseConfigured()) return { items: [], platforms: {} };
  await connectToDatabase();
  const docs = await ExternalCache.find({ key: { $in: Object.keys(PLATFORMS).map(key) } }).lean();
  const stale = [];
  const platforms = {};
  await Promise.all(
    Object.keys(PLATFORMS).map(async (platform) => {
      let doc = docs.find((d) => d.key === key(platform));
      if (!doc?.fetchedAt && !(doc?.attemptedAt && Date.now() - new Date(doc.attemptedAt) < 60_000)) doc = (await refresh(platform, { timeoutMs: 6000 })) ?? doc;
      else if (doc?.fetchedAt && Date.now() - new Date(doc.fetchedAt) > MAX_AGE_MS) stale.push(platform);
      platforms[platform] = { label: PLATFORMS[platform].label, fetchedAt: doc?.fetchedAt ?? null, error: doc?.error ?? null, data: doc?.data ?? [] };
    }),
  );
  if (stale.length) after(async () => { for (const p of stale) await refresh(p); });

  const now = Date.now();
  const items = Object.values(platforms)
    .flatMap((p) => p.data)
    .filter((c) => new Date(c.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .slice(0, limit);
  const updatedAt = Object.values(platforms).reduce((min, p) => (p.fetchedAt && (!min || p.fetchedAt < min) ? p.fetchedAt : min), null);
  return JSON.parse(JSON.stringify({
    items,
    updatedAt,
    platforms: Object.fromEntries(Object.entries(platforms).map(([k, p]) => [k, { label: p.label, available: !p.error || p.data.length > 0 }])),
  }));
}
