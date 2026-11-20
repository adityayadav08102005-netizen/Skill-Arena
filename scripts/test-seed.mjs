/**
 * Runs the real seed script twice against a throwaway in-memory MongoDB
 * replica set, then checks counts, idempotency, hidden fields and demo login.
 *
 *   npm run test:seed
 *
 * Needs no Atlas account. The first run downloads a MongoDB server binary.
 */
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { problems as CATALOGUE } from "../data/problems/index.js";

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const env = {
  ...process.env,
  MONGODB_URI: replSet.getUri(),
  MONGODB_DB: "skillarena_test",
  BETTER_AUTH_SECRET: "test-secret-for-local-seed-checks-only-0123456789",
  BETTER_AUTH_URL: "http://localhost:3000",
  DEMO_USER_PASSWORD: "seed-check-pass-123",
};

// Async on purpose: a synchronous spawn blocks this process's event loop, which
// also services the in-memory mongod's output pipes, and the two deadlock.
const runSeed = (label) =>
  new Promise((resolve, reject) => {
    console.log(`\n── seed run: ${label} ──`);
    const child = spawn(process.execPath, ["scripts/seed.mjs"], { env, stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed (${label}) exited with ${code}`))));
  });

let failed = false;
const client = new MongoClient(env.MONGODB_URI);
try {
  await runSeed("first");
  await client.connect();
  const db = client.db(env.MONGODB_DB);
  const count = (name, filter = {}) => db.collection(name).countDocuments(filter);

  const first = {};
  for (const name of [
    "user", "profiles", "skills", "problems", "questions", "assessments", "opportunities", "contests",
    "problem_submissions", "assessment_attempts", "applications", "xp_events", "user_achievements",
    "recruiter_companies", "daily_challenges", "contest_participants", "notifications", "saved_opportunities",
  ]) {
    first[name] = await count(name);
  }
  console.log("\ncounts:", first);

  assert.equal(first.user, 9, "9 demo accounts");
  assert.equal(first.profiles, 9, "a profile per account");
  assert.equal(first.problems, CATALOGUE.length, "every catalogue problem seeded");
  assert.equal(first.questions, 60);
  assert.equal(first.assessments, 12);
  assert.equal(first.opportunities, 12);
  assert.equal(first.contests, 3);
  assert.equal(first.daily_challenges, 15);
  assert.ok(first.problem_submissions > 100, "sample submissions created");

  // Roles: exactly one admin, two recruiters.
  assert.equal(await count("user", { role: "admin" }), 1);
  assert.equal(await count("user", { role: "recruiter" }), 2);

  // Profile XP must equal the XP ledger total for every student.
  const ledger = await db.collection("xp_events").aggregate([{ $group: { _id: "$userId", total: { $sum: "$amount" } } }]).toArray();
  for (const row of ledger) {
    const profile = await db.collection("profiles").findOne({ userId: row._id });
    assert.equal(profile.xp, row.total, `profile XP matches ledger for ${profile.fullName}`);
  }

  // Hidden fields stay hidden through Mongoose defaults.
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });
  const { Problem, Question } = await import("../lib/db/models/index.js");
  const p = await Problem.findOne().lean();
  assert.equal(p.hiddenTests, undefined, "hidden tests not selected by default");
  const q = await Question.findOne().lean();
  assert.equal(q.answer, undefined, "question answers not selected by default");
  await mongoose.disconnect();

  // Idempotency: a second run must not duplicate anything.
  await runSeed("second");
  for (const [name, n] of Object.entries(first)) {
    assert.equal(await count(name), n, `${name} unchanged after re-seed`);
  }

  // Demo login works with the configured password and fails with a wrong one.
  const { createAuth } = await import("../lib/auth/config.js");
  process.env.BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_URL = env.BETTER_AUTH_URL;
  const auth = createAuth({ client, dbName: env.MONGODB_DB });
  const ok = await auth.api.signInEmail({ body: { email: "aarav@students.skillarena.test", password: env.DEMO_USER_PASSWORD } });
  assert.ok(ok?.user?.id, "demo student can sign in");
  await assert.rejects(
    auth.api.signInEmail({ body: { email: "aarav@students.skillarena.test", password: "wrong-password" } }),
    "wrong password is rejected",
  );

  // Role cannot be set through sign-up.
  await auth.api.signUpEmail({ body: { email: "sneaky@example.test", password: "another-pass-123", name: "Sneaky", role: "admin" } }).catch(() => {});
  const sneaky = await db.collection("user").findOne({ email: "sneaky@example.test" });
  assert.ok(!sneaky || sneaky.role === "student", "sign-up cannot choose the admin role");

  console.log("\n✔ seed checks passed");
} catch (error) {
  failed = true;
  console.error("\n✖ seed checks failed:", error.message);
} finally {
  await client.close();
  await replSet.stop();
  process.exit(failed ? 1 : 0);
}
