import "server-only";
import mongoose from "mongoose";
import { apiError } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db/mongoose";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

/**
 * Rate limiting for Route Handlers, shared by every server instance.
 *
 * With a database, counts live in MongoDB (`rate_limits`, fixed windows,
 * removed automatically by a TTL index), so limits hold on serverless hosts
 * where each instance has its own memory. If the database can't be reached,
 * it falls back to this instance's memory rather than blocking everyone.
 */

// ── In-memory fallback (also used in demo mode) ──────────────────
const buckets = (globalThis.__skillarenaRateLimit ??= new Map());

function memoryLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear(); // crude memory cap
  return { ok: true };
}

// ── MongoDB store ────────────────────────────────────────────────
const state = (globalThis.__skillarenaRateLimitDb ??= { indexes: null });

async function collection() {
  await connectToDatabase();
  const col = mongoose.connection.collection("rate_limits");
  state.indexes ??= col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => {
    state.indexes = null;
    throw error;
  });
  await state.indexes;
  return col;
}

async function databaseLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const id = `${key}:${windowStart}`;
  const col = await collection();
  const bump = () =>
    col.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs + 60_000) } },
      { upsert: true, returnDocument: "after" },
    );
  let doc;
  try {
    doc = await bump();
  } catch (error) {
    if (error?.code !== 11000) throw error;
    doc = await bump(); // two requests created the window at once; the second update wins cleanly
  }
  const count = doc?.count ?? doc?.value?.count ?? 1;
  if (count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)) };
  return { ok: true };
}

/** { ok } or { ok: false, retryAfter } for `key` under `limit` requests per `windowMs`. */
export async function rateLimit(key, options) {
  if (!isDatabaseConfigured()) return memoryLimit(key, options);
  try {
    return await databaseLimit(key, options);
  } catch (error) {
    console.error("rate limit store unavailable, using memory", error?.message);
    return memoryLimit(key, options);
  }
}

/** Returns a 429 response when the user/action is over the limit, otherwise null. */
export async function limitOrNull(key, options) {
  const result = await rateLimit(key, options);
  if (result.ok) return null;
  const response = apiError(429, `Too many requests. Try again in ${result.retryAfter} seconds.`);
  response.headers.set("Retry-After", String(result.retryAfter));
  return response;
}
