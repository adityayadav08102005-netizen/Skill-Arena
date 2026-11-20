import "server-only";
import { ObjectId } from "mongodb";
import { after } from "next/server";
import { ExternalApiError } from "@/lib/api/http";
import { CODEFORCES_HANDLE, GITHUB_USERNAME, fetchCodeforcesSummary, fetchGithubSummary } from "@/lib/api/providers";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ExternalProfile, Profile } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));

const PROVIDERS = {
  github: { field: "githubUsername", valid: GITHUB_USERNAME, fetch: fetchGithubSummary, maxAgeMs: 12 * 3_600_000, label: "GitHub" },
  codeforces: { field: "codeforcesHandle", valid: CODEFORCES_HANDLE, fetch: fetchCodeforcesSummary, maxAgeMs: 6 * 3_600_000, label: "Codeforces" },
};
const RETRY_AFTER_ERROR_MS = 15 * 60_000; // don't hammer a service that just failed
const MANUAL_COOLDOWN_MS = 5 * 60_000;

export class ExternalProfileError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Fetch and store one provider's summary. A failure keeps the last good copy;
 * "not found" clears it (the handle is wrong). Never throws.
 */
async function refresh(userId, provider, handle, { timeoutMs } = {}) {
  const p = PROVIDERS[provider];
  const now = new Date();
  // Claim the refresh so parallel page views don't all call the API.
  const claimed = await ExternalProfile.findOneAndUpdate(
    { userId: oid(userId), provider, $or: [{ attemptedAt: null }, { attemptedAt: { $lt: new Date(now - 30_000) } }, { handle: { $ne: handle } }] },
    { $set: { attemptedAt: now, handle } },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) {
    try {
      await ExternalProfile.create({ userId: oid(userId), provider, handle, attemptedAt: now, status: "pending" });
    } catch (error) {
      if (error?.code === 11000) return null; // someone else is refreshing it
      throw error;
    }
  }
  try {
    const data = await (timeoutMs ? Promise.race([p.fetch(handle), new Promise((_, reject) => setTimeout(() => reject(new ExternalApiError(p.label, "unavailable", `${p.label} took too long to respond.`)), timeoutMs))]) : p.fetch(handle));
    return ExternalProfile.findOneAndUpdate({ userId: oid(userId), provider }, { $set: { handle, data, fetchedAt: new Date(), status: "ok", error: null } }, { returnDocument: "after" }).lean();
  } catch (error) {
    const notFound = error instanceof ExternalApiError && error.code === "not_found";
    const message = error instanceof ExternalApiError ? error.message : `Couldn't load ${p.label} right now.`;
    if (!(error instanceof ExternalApiError)) console.error(`${provider} refresh failed`, error);
    const set = notFound ? { status: "not_found", error: message, data: null, fetchedAt: null } : { status: "error", error: message };
    return ExternalProfile.findOneAndUpdate({ userId: oid(userId), provider }, { $set: set }, { returnDocument: "after" }).lean();
  }
}

function view(doc, provider, handle) {
  const p = PROVIDERS[provider];
  const fresh = doc?.fetchedAt && Date.now() - new Date(doc.fetchedAt) < p.maxAgeMs;
  return {
    provider,
    handle,
    status: doc?.handle === handle ? doc.status : "pending",
    data: doc?.handle === handle ? doc.data : null,
    fetchedAt: doc?.handle === handle ? doc.fetchedAt : null,
    stale: !fresh,
    error: doc?.handle === handle ? doc.error : null,
  };
}

/**
 * GitHub and Codeforces summaries for a profile, from the stored copy.
 * Missing copies are fetched now (with a short timeout); stale ones are
 * refreshed after the response is sent. `providers` limits which to load.
 */
export async function getExternalStats(userId, profile, { providers = ["github", "codeforces"], inline = true } = {}) {
  if (!isDatabaseConfigured() || !profile) return {};
  await connectToDatabase();
  const wanted = providers.filter((k) => profile[PROVIDERS[k].field] && PROVIDERS[k].valid.test(profile[PROVIDERS[k].field]));
  if (!wanted.length) return {};
  const docs = await ExternalProfile.find({ userId: oid(userId), provider: { $in: wanted } }).lean();
  const result = {};
  const later = [];
  await Promise.all(
    wanted.map(async (provider) => {
      const handle = profile[PROVIDERS[provider].field];
      let doc = docs.find((d) => d.provider === provider);
      const sameHandle = doc?.handle === handle;
      const recentlyFailed = sameHandle && doc.status === "error" && doc.attemptedAt && Date.now() - new Date(doc.attemptedAt) < RETRY_AFTER_ERROR_MS;
      const recentlyTried = sameHandle && doc.attemptedAt && Date.now() - new Date(doc.attemptedAt) < 30_000;
      if ((!sameHandle || (!doc.fetchedAt && doc.status === "pending")) && inline && !recentlyTried) {
        doc = (await refresh(userId, provider, handle, { timeoutMs: 6000 })) ?? doc;
      } else if (sameHandle && doc.status !== "not_found" && !recentlyFailed && !recentlyTried && (!doc.fetchedAt || Date.now() - new Date(doc.fetchedAt) >= PROVIDERS[provider].maxAgeMs)) {
        later.push([provider, handle]);
      }
      result[provider] = view(doc, provider, handle);
    }),
  );
  if (later.length) {
    after(async () => {
      for (const [provider, handle] of later) await refresh(userId, provider, handle);
    });
  }
  return plain(result);
}

/** The owner's "Refresh" button: both providers now, at most every 5 minutes. */
export async function refreshMine(user) {
  await connectToDatabase();
  const profile = await Profile.findOne({ userId: oid(user.id) }, { githubUsername: 1, codeforcesHandle: 1 }).lean();
  if (!profile?.githubUsername && !profile?.codeforcesHandle) throw new ExternalProfileError("Add your GitHub username or Codeforces handle to your profile first.", 422);
  const recent = await ExternalProfile.findOne({ userId: oid(user.id), attemptedAt: { $gt: new Date(Date.now() - MANUAL_COOLDOWN_MS) }, status: { $ne: "pending" } }, { attemptedAt: 1 }).lean();
  if (recent) {
    const wait = Math.ceil((MANUAL_COOLDOWN_MS - (Date.now() - new Date(recent.attemptedAt))) / 60_000);
    throw new ExternalProfileError(`Refreshed recently. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`, 429);
  }
  const out = {};
  for (const provider of Object.keys(PROVIDERS)) {
    const handle = profile[PROVIDERS[provider].field];
    if (!handle || !PROVIDERS[provider].valid.test(handle)) continue;
    // Clear the claim so this manual refresh always runs.
    await ExternalProfile.updateOne({ userId: oid(user.id), provider }, { $set: { attemptedAt: null } });
    out[provider] = view(await refresh(user.id, provider, handle), provider, handle);
  }
  return plain(out);
}

/** Called when a profile's handles change, so the old account's stats aren't shown under the new name. */
export async function forgetStaleHandles(userId, profile) {
  await connectToDatabase();
  for (const [provider, p] of Object.entries(PROVIDERS)) {
    const handle = profile?.[p.field];
    await ExternalProfile.deleteMany({ userId: oid(userId), provider, ...(handle ? { handle: { $ne: handle } } : {}) });
  }
}
