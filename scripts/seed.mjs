/**
 * Seeds MongoDB with SkillArena's sample content and demo accounts.
 *
 *   npm run seed
 *
 * Reads .env.local. Safe to re-run: catalogue content is upserted by id and
 * demo activity (records flagged isSample) is regenerated for demo users only.
 * Real users' data is never touched.
 */
import { existsSync } from "node:fs";
import mongoose from "mongoose";
import { MongoClient, ObjectId } from "mongodb";

import { createAuth } from "../lib/auth/config.js";
import * as M from "../lib/db/models/index.js";
import { dayKey, shiftDay } from "../lib/utils/time.js";
import { XP_RULES } from "../lib/utils/xp.js";
import { assessments, questions } from "../data/assessments/index.js";
import { achievements } from "../data/demo/achievements.js";
import { buildDemoActivity } from "../data/demo/activity.js";
import { companies } from "../data/demo/companies.js";
import { contests } from "../data/demo/contests.js";
import { skills, skillByName } from "../data/demo/skills.js";
import { demoAdmin, demoRecruiters, demoStudents, demoUsers } from "../data/demo/users.js";
import { opportunities } from "../data/opportunities/index.js";
import { problems } from "../data/problems/index.js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { MONGODB_URI, MONGODB_DB, DEMO_USER_PASSWORD, BETTER_AUTH_SECRET } = process.env;
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};
if (!MONGODB_URI) fail("MONGODB_URI is not set in .env.local.");
if (!BETTER_AUTH_SECRET) fail("BETTER_AUTH_SECRET is not set in .env.local.");
if (!DEMO_USER_PASSWORD || DEMO_USER_PASSWORD.length < 8) fail("DEMO_USER_PASSWORD must be set and at least 8 characters.");

const DAY = 86_400_000;
const HOUR = 3_600_000;
const oid = (id) => new ObjectId(id);
const now = new Date();
const log = (msg) => console.log(`  ${msg}`);

async function upsertAll(Model, docs, label) {
  if (!docs.length) return;
  await Model.bulkWrite(
    docs.map(({ id, ...doc }) => ({
      replaceOne: { filter: { _id: oid(id) }, replacement: { _id: oid(id), ...doc }, upsert: true },
    })),
  );
  log(`${label}: ${docs.length}`);
}

async function seedContent() {
  console.log("\nContent");
  await upsertAll(M.Skill, skills, "skills");
  await upsertAll(M.Company, companies.map((c) => ({ ...c, isSample: true })), "companies");
  await upsertAll(M.Problem, problems.map((p) => ({ ...p, isPublished: true })), "problems");
  await upsertAll(M.Assessment, assessments.map((a) => ({ ...a, isPublished: true })), "assessments");
  await upsertAll(M.Question, questions.map((q) => ({ ...q, isActive: true })), "questions");
  await upsertAll(M.Achievement, achievements, "achievements");
  await upsertAll(
    M.Opportunity,
    opportunities.map(({ postedDaysAgo, deadlineInDays, ...o }) => ({
      ...o,
      postedAt: new Date(now.getTime() - postedDaysAgo * DAY),
      applicationDeadline: new Date(now.getTime() + deadlineInDays * DAY),
      isSample: true,
    })),
    "opportunities",
  );
  await upsertAll(
    M.Contest,
    contests.map(({ startsInHours, durationMinutes, ...c }) => {
      const startsAt = new Date(Math.round((now.getTime() + startsInHours * HOUR) / HOUR) * HOUR);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
      // Finished sample contests already have final ranks in the sample data.
      return { ...c, startsAt, endsAt, isPublished: true, finalizedAt: endsAt < now ? endsAt : null };
    }),
    "contests",
  );

  // Daily challenges for the past 7 and next 7 days, cycling through the catalogue.
  const daily = [];
  for (let offset = -7; offset <= 7; offset += 1) {
    const date = shiftDay(dayKey(now), -offset); // platform calendar days, same as the app
    const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
    daily.push({ date, problemId: oid(problems[dayNumber % problems.length].id), bonusXp: XP_RULES.dailyChallengeBonus });
  }
  await M.DailyChallenge.bulkWrite(
    daily.map((d) => ({ updateOne: { filter: { date: d.date }, update: { $set: d }, upsert: true } })),
  );
  log(`daily challenges: ${daily.length}`);
}

async function seedUsers(auth, db) {
  console.log("\nDemo accounts");
  const users = db.collection("user");
  const idMap = new Map(); // demo id -> real ObjectId

  for (const demo of demoUsers) {
    let user = await users.findOne({ email: demo.email });
    if (!user) {
      await auth.api.signUpEmail({ body: { email: demo.email, password: DEMO_USER_PASSWORD, name: demo.name } });
      user = await users.findOne({ email: demo.email });
    }
    // Role is server-managed (input: false), so the seed sets it directly.
    await users.updateOne({ _id: user._id }, { $set: { role: demo.role, emailVerified: true } });
    idMap.set(demo.id, user._id);
    log(`${demo.role.padEnd(9)} ${demo.email}`);
  }

  for (const s of demoStudents) {
    await M.Profile.updateOne(
      { userId: idMap.get(s.id) },
      {
        $set: {
          fullName: s.name,
          headline: s.headline,
          college: s.college,
          degree: s.degree,
          department: s.department,
          graduationYear: s.graduationYear,
          preferredRoles: s.preferredRoles,
          skills: s.skills.map(([name, proficiency]) => ({
            skillId: oid(skillByName[name].id),
            name,
            proficiency,
            source: "self",
          })),
          education: [
            { institution: s.college, degree: s.degree, fieldOfStudy: s.department, startYear: s.graduationYear - 4, endYear: s.graduationYear },
          ],
          projects: [
            { title: `${s.preferredRoles[0]} portfolio project`, description: "Sample project created by the seed script.", techStack: s.skills.slice(0, 3).map(([n]) => n) },
          ],
          onboardingComplete: true,
          isSample: true,
        },
      },
      { upsert: true },
    );
  }
  for (const r of demoRecruiters) {
    const userId = idMap.get(r.id);
    await M.Company.updateOne({ _id: oid(r.companyId) }, { $set: { ownerId: userId } });
    await M.Profile.updateOne(
      { userId },
      { $set: { fullName: r.name, companyId: oid(r.companyId), jobTitle: r.title, onboardingComplete: true, isSample: true } },
      { upsert: true },
    );
    await M.Opportunity.updateMany({ companyId: oid(r.companyId), source: "manual" }, { $set: { postedBy: userId } });
  }
  await M.Profile.updateOne(
    { userId: idMap.get(demoAdmin.id) },
    { $set: { fullName: demoAdmin.name, onboardingComplete: true, isSample: true } },
    { upsert: true },
  );
  return idMap;
}

async function seedActivity(idMap) {
  console.log("\nDemo activity");
  const real = (demoUserId) => idMap.get(demoUserId);
  const studentIds = demoStudents.map((s) => real(s.id));
  const filter = { isSample: true, userId: { $in: studentIds } };

  await Promise.all([
    M.ProblemSubmission.deleteMany(filter),
    M.AssessmentAttempt.deleteMany(filter),
    M.ContestParticipant.deleteMany(filter),
    M.SavedOpportunity.deleteMany(filter),
    M.XpEvent.deleteMany(filter),
    M.Application.deleteMany({ isSample: true, studentId: { $in: studentIds } }),
    M.UserAchievement.deleteMany({ userId: { $in: studentIds } }),
    M.Notification.deleteMany({ userId: { $in: [...idMap.values()] }, type: "system" }),
  ]);

  const activity = buildDemoActivity(now);
  const { submissions, attempts, applications, contestEntries, savedOpportunities, stats } = activity;

  await M.ProblemSubmission.insertMany(
    submissions.map(({ id, userId, problemId, ...s }) => ({ _id: oid(id), userId: real(userId), problemId: oid(problemId), ...s })),
  );
  log(`submissions: ${submissions.length}`);

  await M.AssessmentAttempt.insertMany(
    attempts.map(({ id, userId, assessmentId, ...a }) => ({ _id: oid(id), userId: real(userId), assessmentId: oid(assessmentId), ...a })),
  );
  log(`assessment attempts: ${attempts.length}`);

  await M.ContestParticipant.insertMany(
    contestEntries.map(({ contestId, userId, ...e }) => ({ contestId: oid(contestId), userId: real(userId), ...e })),
  );
  log(`contest results: ${contestEntries.length}`);

  await M.Application.insertMany(
    applications.map(({ id, opportunityId, studentId, status, appliedAt, ...a }) => ({
      _id: oid(id),
      opportunityId: oid(opportunityId),
      studentId: real(studentId),
      status,
      appliedAt,
      history: [{ status: "applied", changedBy: real(studentId), at: appliedAt }].concat(
        status === "applied" ? [] : [{ status, at: new Date(appliedAt.getTime() + DAY) }],
      ),
      ...a,
    })),
  );
  log(`applications: ${applications.length}`);

  await M.SavedOpportunity.insertMany(
    savedOpportunities.map(({ userId, opportunityId, ...s }) => ({ userId: real(userId), opportunityId: oid(opportunityId), ...s })),
  );

  // XP ledger: one event per reward, matching the totals computed by the generator.
  const xpEvents = [];
  for (const s of submissions.filter((x) => x.xpAwarded > 0)) {
    xpEvents.push({ userId: real(s.userId), amount: s.xpAwarded, reason: "problem_solved", refId: s.problemId, createdAt: s.createdAt });
  }
  for (const a of attempts.filter((x) => x.xpAwarded > 0)) {
    xpEvents.push({ userId: real(a.userId), amount: a.xpAwarded, reason: "assessment_passed", refId: a.id, createdAt: a.submittedAt });
  }
  for (const e of contestEntries) {
    xpEvents.push({ userId: real(e.userId), amount: XP_RULES.contestParticipation, reason: "contest_participation", refId: e.contestId, createdAt: now });
  }
  for (const st of stats) {
    for (const [days, bonus] of Object.entries(XP_RULES.streakMilestones)) {
      if (st.streak.longest >= Number(days)) {
        xpEvents.push({ userId: real(st.userId), amount: bonus, reason: "streak_milestone", refId: `streak-${days}`, createdAt: now });
      }
    }
    xpEvents.push({ userId: real(st.userId), amount: XP_RULES.profileComplete, reason: "profile_complete", refId: "profile", createdAt: now });
  }
  await M.XpEvent.insertMany(xpEvents.map((e) => ({ ...e, isSample: true })));
  log(`xp events: ${xpEvents.length}`);

  // Cached profile stats and earned achievements.
  const achievementByCode = Object.fromEntries(achievements.map((a) => [a.code, a]));
  for (const st of stats) {
    const userId = real(st.userId);
    await M.Profile.updateOne(
      { userId },
      { $set: { xp: st.xp, level: st.level, skillLevel: st.skillLevel, streak: st.streak } },
    );
    const earned = [];
    if (st.solvedCount >= 1) earned.push("first-solve");
    if (st.solvedCount >= 10) earned.push("ten-solves");
    if (st.solvedByDifficulty.hard >= 1) earned.push("first-hard");
    if (st.streak.longest >= 7) earned.push("streak-7");
    if (attempts.some((a) => a.userId === st.userId)) earned.push("first-assessment");
    if (attempts.some((a) => a.userId === st.userId && a.percentage >= 90)) earned.push("assessment-90");
    if (contestEntries.some((e) => e.userId === st.userId)) earned.push("first-contest");
    if (applications.some((a) => a.studentId === st.userId)) earned.push("first-application");
    await M.UserAchievement.insertMany(
      earned.map((code) => ({ userId, achievementId: oid(achievementByCode[code].id), earnedAt: now })),
    );
  }

  await M.Notification.insertMany(
    [...idMap.values()].map((userId) => ({
      userId,
      type: "system",
      title: "Welcome to SkillArena",
      body: "This is a demo account filled with sample data.",
      link: "/dashboard",
    })),
  );
  log("profiles, achievements and notifications updated");
}

async function main() {
  console.log(`Seeding ${MONGODB_DB || "(database from URI)"} …`);
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB || undefined, serverSelectionTimeoutMS: 10_000 });
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB || undefined);

  console.log("\nIndexes");
  for (const Model of Object.values(M).filter((m) => typeof m?.syncIndexes === "function")) {
    await Model.syncIndexes();
  }
  log("synced for all collections");

  await seedContent();
  const auth = createAuth({ client, dbName: MONGODB_DB || undefined });
  const idMap = await seedUsers(auth, db);
  await seedActivity(idMap);

  console.log("\n✔ Done. Sign in with any demo email and DEMO_USER_PASSWORD from .env.local.\n");
  await mongoose.disconnect();
  await client.close();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
