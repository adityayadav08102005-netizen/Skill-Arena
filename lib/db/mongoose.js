import "server-only";
import mongoose from "mongoose";

/**
 * Shared Mongoose connection. Cached on globalThis so hot reloads and
 * serverless invocations reuse one pool instead of opening a new one per request.
 */
const cache = (globalThis.__skillarenaMongoose ??= { conn: null, promise: null });

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local or run in demo mode.");
  }
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose
    .connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    })
    .catch((error) => {
      cache.promise = null;
      throw error;
    });
  cache.conn = await cache.promise;
  return cache.conn;
}
