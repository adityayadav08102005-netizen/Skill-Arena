/**
 * Grants the admin role to an existing account.
 *
 *   npm run make-admin -- someone@example.com
 *
 * Admin can never be chosen at sign-up; this script is the only way to create one.
 */
import { existsSync } from "node:fs";
import { MongoClient } from "mongodb";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local.");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || undefined);
  const users = db.collection("user");
  const result = await users.updateOne({ email }, { $set: { role: "admin" } });
  if (result.matchedCount > 0) {
    // Mark setup as done so the admin isn't sent to the student/recruiter setup step.
    const user = await users.findOne({ email }, { projection: { _id: 1, name: 1 } });
    await db.collection("profiles").updateOne(
      { userId: user._id },
      { $set: { onboardingComplete: true }, $setOnInsert: { userId: user._id, fullName: user.name || email.split("@")[0], createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true },
    );
  }
  if (result.matchedCount === 0) {
    console.error(`No account found for ${email}. Sign up first, then run this again.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now an admin.`);
  }
} finally {
  await client.close();
}
