import "server-only";
import { ExternalApiError } from "@/lib/api/http";
import { adzunaConfigured, fetchAdzunaJobs, fetchArbeitnowJobs, fetchHimalayasJobs, fetchJobicyJobs, fetchRemotiveJobs } from "@/lib/api/providers";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Integration, Opportunity, Skill } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

/**
 * Job board imports. Remotive asks for at most ~4 requests a day, so it syncs
 * at most every 6 hours whoever asks; Arbeitnow updates hourly. Listings stay
 * external: they link back to the source and are labelled with it.
 */
export const SOURCES = {
  remotive: { label: "Remotive", fetch: fetchRemotiveJobs, minIntervalMs: 6 * 3_600_000, autoIntervalMs: 6 * 3_600_000, site: "https://remotive.com" },
  arbeitnow: { label: "Arbeitnow", fetch: fetchArbeitnowJobs, minIntervalMs: 30 * 60_000, autoIntervalMs: 3 * 3_600_000, site: "https://www.arbeitnow.com" },
  himalayas: { label: "Himalayas", fetch: fetchHimalayasJobs, minIntervalMs: 60 * 60_000, autoIntervalMs: 6 * 3_600_000, site: "https://himalayas.app" },
  jobicy: { label: "Jobicy", fetch: fetchJobicyJobs, minIntervalMs: 60 * 60_000, autoIntervalMs: 6 * 3_600_000, site: "https://jobicy.com" },
  // India listings (incl. internships); needs a free key, so it's skipped until ADZUNA_APP_ID/KEY are set.
  adzuna: { label: "Adzuna (India)", fetch: fetchAdzunaJobs, minIntervalMs: 60 * 60_000, autoIntervalMs: 6 * 3_600_000, site: "https://www.adzuna.in", enabled: adzunaConfigured },
};
const LOCK_MS = 5 * 60_000;
const MAX_AGE_MS = 60 * 86_400_000; // external listings older than this are closed

export class SyncError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Sources that need a key are skipped until it's set. */
export function isEnabled(key) {
  return SOURCES[key]?.enabled ? SOURCES[key].enabled() : Boolean(SOURCES[key]);
}

/** When this source may sync again (null = now). */
export function nextAllowedAt(key, integration, { auto = false } = {}) {
  const interval = auto ? SOURCES[key].autoIntervalMs : SOURCES[key].minIntervalMs;
  if (!integration?.lastRunAt) return null;
  const next = new Date(new Date(integration.lastRunAt).getTime() + interval);
  return next > new Date() ? next : null;
}

async function claim(key, trigger, auto) {
  const now = new Date();
  const current = await Integration.findOne({ key }).lean();
  const next = nextAllowedAt(key, current, { auto });
  if (next) return { skipped: "interval", nextAt: next };
  if (current?.lockedUntil && current.lockedUntil > now) return { skipped: "running" };
  try {
    const locked = await Integration.findOneAndUpdate(
      { key, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] },
      { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS), lastRunAt: now, trigger } },
      { upsert: true, returnDocument: "after" },
    ).lean();
    return { locked };
  } catch (error) {
    if (error?.code === 11000) return { skipped: "running" }; // another request created the row first
    throw error;
  }
}

/**
 * Fetch one board and upsert its listings. Listings an admin took down stay
 * down; ones that disappeared from the board are closed (but only when the
 * board actually returned listings, so an empty or broken response can't
 * close everything).
 */
export async function syncSource(key, { trigger = "admin", auto = false } = {}) {
  const source = SOURCES[key];
  if (!source) throw new SyncError("Unknown job board.", 404);
  if (!isDatabaseConfigured()) throw new SyncError("Job imports need a connected database.", 503);
  if (!isEnabled(key)) return { skipped: "not_configured" };
  await connectToDatabase();

  const claimed = await claim(key, trigger, auto);
  if (claimed.skipped) return claimed;

  const startedAt = new Date();
  try {
    const catalogue = (await Skill.find({}, { name: 1 }).lean()).map((s) => s.name);
    const { fetched, items } = await source.fetch(catalogue);

    let created = 0;
    let updated = 0;
    if (items.length) {
      const res = await Opportunity.bulkWrite(
        items.map((item) => ({
          updateOne: {
            filter: { source: key, externalId: item.externalId },
            update: {
              $set: { ...item, salary: item.salary ?? undefined, lastSeenAt: startedAt },
              // notifiedAt is set so imports never trigger "new match" notifications.
              $setOnInsert: { status: "published", notifiedAt: startedAt, isSample: false, companyId: null, postedBy: null, graduationYears: [] },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      created = res.upsertedCount;
      updated = res.modifiedCount;
      // Back on the board after being closed as missing → open again (admin take-downs are "rejected" and stay).
      await Opportunity.updateMany({ source: key, externalId: { $in: items.map((i) => i.externalId) }, status: "closed" }, { $set: { status: "published" } });
    }

    let closed = 0;
    if (fetched > 0) {
      const gone = await Opportunity.updateMany({ source: key, status: "published", lastSeenAt: { $lt: startedAt } }, { $set: { status: "closed" } });
      closed += gone.modifiedCount;
    }
    const old = await Opportunity.updateMany({ source: key, status: "published", postedAt: { $lt: new Date(Date.now() - MAX_AGE_MS) } }, { $set: { status: "closed" } });
    closed += old.modifiedCount;

    const stats = { fetched, kept: items.length, created, updated, closed };
    await Integration.updateOne({ key }, { $set: { lockedUntil: null, lastSuccessAt: new Date(), lastError: null, lastStats: stats } });
    return { ok: true, stats };
  } catch (error) {
    const message = error instanceof ExternalApiError ? error.message : "The import failed. Check the server log.";
    if (!(error instanceof ExternalApiError)) console.error(`${key} sync failed`, error);
    await Integration.updateOne({ key }, { $set: { lockedUntil: null, lastError: message } });
    return { ok: false, error: message };
  }
}

/** Sync every board that's due. Used by the SkillBridge page (after the response) and the cron endpoint. */
export async function syncDueSources({ trigger = "auto" } = {}) {
  if (!isDatabaseConfigured()) return {};
  const out = {};
  for (const key of Object.keys(SOURCES)) if (isEnabled(key)) out[key] = await syncSource(key, { trigger, auto: true });
  return out;
}

/** Cheap check before scheduling an automatic sync from a page view. */
export async function anySourceDue() {
  if (!isDatabaseConfigured()) return false;
  await connectToDatabase();
  const rows = await Integration.find({}, { key: 1, lastRunAt: 1 }).lean();
  return Object.keys(SOURCES).some((key) => isEnabled(key) && !nextAllowedAt(key, rows.find((r) => r.key === key), { auto: true }));
}
