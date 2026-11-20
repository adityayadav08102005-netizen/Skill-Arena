import "server-only";
import { MongoClient, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { createAuth } from "./config";

/**
 * Server-side Better Auth instance, created lazily and cached across hot
 * reloads. Returns null in demo mode (no MONGODB_URI), so importing this
 * module never crashes a site that has no database yet.
 */
const cache = (globalThis.__skillarenaAuth ??= { auth: null, client: null });

async function createProfileFor(user) {
  await connectToDatabase();
  await Profile.updateOne(
    { userId: new ObjectId(user.id) },
    { $setOnInsert: { userId: new ObjectId(user.id), fullName: user.name || user.email.split("@")[0] } },
    { upsert: true },
  );
}

export function getAuth() {
  if (!isDatabaseConfigured()) return null;
  if (!cache.auth) {
    cache.client ??= new MongoClient(process.env.MONGODB_URI);
    cache.auth = createAuth({
      client: cache.client,
      dbName: process.env.MONGODB_DB || undefined,
      onUserCreated: createProfileFor,
    });
  }
  return cache.auth;
}
