/**
 * Starts a temporary local MongoDB (in memory), seeds it, and keeps it running
 * until you press Ctrl+C. Handy for demos and testing without an Atlas account.
 *
 *   npm run dev:memory-db
 *
 * Then, in another terminal, start the app pointing at it (the URI is printed):
 *   MONGODB_URI=<printed uri> npm run dev
 *
 * Everything is deleted when this process stops.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const port = Number(process.env.MEMORY_DB_PORT || 27099);
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ port }] });
const uri = replSet.getUri("skillarena");

const env = {
  ...process.env,
  MONGODB_URI: uri,
  MONGODB_DB: "skillarena",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "memory-db-only-secret-not-for-production-0123456789",
  DEMO_USER_PASSWORD: process.env.DEMO_USER_PASSWORD || "",
};

if (env.DEMO_USER_PASSWORD.length >= 8) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/seed.mjs"], { env, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed exited with ${code}`))));
  });
} else {
  console.log("DEMO_USER_PASSWORD is not set, so the database starts empty (no demo accounts).");
}

console.log(`\nIn-memory MongoDB running at:\n  ${uri}\n\nPress Ctrl+C to stop (all data is discarded).`);

const stop = async () => {
  await replSet.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30); // keep the process alive
