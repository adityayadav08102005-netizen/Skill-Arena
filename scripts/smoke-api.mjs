/**
 * End-to-end smoke test for auth, onboarding, profiles, uploads and access rules
 * against a running server that is connected to a seeded database.
 *
 *   BASE_URL=http://localhost:3000 DEMO_USER_PASSWORD=... node scripts/smoke-api.mjs
 *
 * Creates one extra throwaway account (smoke-<timestamp>@example.test).
 */
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = process.env.DEMO_USER_PASSWORD;
if (!PASSWORD) {
  console.error("Set DEMO_USER_PASSWORD to the password used by npm run seed.");
  process.exit(1);
}

let passed = 0;
const step = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (error) {
    console.error(`  ✖ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

async function call(path, { method = "GET", cookie, json, form, redirect = "manual" } = {}) {
  const headers = { Origin: BASE };
  if (cookie) headers.Cookie = cookie;
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(BASE + path, { method, headers, body, redirect });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json() : await res.text();
  return { res, data };
}

async function signIn(email) {
  const { res, data } = await call("/api/auth/sign-in/email", { method: "POST", json: { email, password: PASSWORD } });
  assert.equal(res.status, 200, `sign-in ${email}: ${JSON.stringify(data)}`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return { cookie, id: data.user.id };
}

const pdf = (extra = "") => new Blob([`%PDF-1.4\n% smoke test ${extra}\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n`], { type: "application/pdf" });
const png = () =>
  new Blob([Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360000002000154a24f5b0000000049454e44ae426082", "hex")], { type: "image/png" });
const upload = (kind, blob, filename, cookie) => {
  const form = new FormData();
  form.append("file", blob, filename);
  return call(`/api/profile/${kind}`, { method: "POST", form, cookie });
};

console.log(`Smoke testing ${BASE}\n`);

const aarav = await signIn("aarav@students.skillarena.test");
const riya = await signIn("riya@students.skillarena.test");
const priya = await signIn("priya@recruiters.skillarena.test");

await step("protected page redirects to /login when signed out", async () => {
  const { res } = await call("/profile");
  assert.ok([302, 307].includes(res.status), `status ${res.status}`);
  assert.match(res.headers.get("location"), /\/login\?next=%2Fprofile/);
});

await step("API rejects signed-out profile edits with 401", async () => {
  const { res } = await call("/api/profile/basics", { method: "PATCH", json: { fullName: "x" } });
  assert.equal(res.status, 401);
});

await step("wrong password is rejected", async () => {
  const { res } = await call("/api/auth/sign-in/email", { method: "POST", json: { email: "aarav@students.skillarena.test", password: "definitely-wrong" } });
  assert.equal(res.status, 401);
});

await step("student updates basics", async () => {
  const { res, data } = await call("/api/profile/basics", {
    method: "PATCH",
    cookie: aarav.cookie,
    json: {
      fullName: "Aarav Mehta",
      headline: "Frontend-leaning CSE student",
      college: "National Institute of Technology, Tiruchirappalli",
      degree: "B.Tech",
      graduationYear: "2027",
      githubUsername: "https://github.com/aarav-demo",
      linkedinUrl: "https://www.linkedin.com/in/aarav-demo",
    },
  });
  assert.equal(res.status, 200, JSON.stringify(data));
  assert.equal(data.profile.githubUsername, "aarav-demo", "GitHub URL normalised to a username");
  assert.equal(data.profile.graduationYear, 2027);
});

await step("server-managed fields are rejected (xp, role)", async () => {
  const { res } = await call("/api/profile/basics", { method: "PATCH", cookie: aarav.cookie, json: { fullName: "Aarav", xp: 99999 } });
  assert.equal(res.status, 422);
  const { res: res2 } = await call("/api/auth/update-user", { method: "POST", cookie: aarav.cookie, json: { role: "admin" } });
  const { data: session } = await call("/api/auth/get-session", { cookie: aarav.cookie });
  assert.equal(session.user.role, "student", `role changed via update-user (status ${res2.status})`);
});

await step("javascript: links are rejected", async () => {
  const { res } = await call("/api/profile/projects", {
    method: "PATCH",
    cookie: aarav.cookie,
    json: { projects: [{ title: "X", repoUrl: "javascript:alert(1)", techStack: [] }] },
  });
  assert.equal(res.status, 422);
});

await step("skills are saved and de-duplicated", async () => {
  const { res, data } = await call("/api/profile/skills", {
    method: "PATCH",
    cookie: aarav.cookie,
    json: { skills: [{ name: "React", proficiency: 4 }, { name: "react", proficiency: 2 }, { name: "Svelte", proficiency: 2 }, { name: "Python", proficiency: 3 }] },
  });
  assert.equal(res.status, 200, JSON.stringify(data));
  assert.deepEqual(data.profile.skills.map((s) => s.name), ["React", "Svelte", "Python"]);
});

await step("onboarding cannot be replayed to change role", async () => {
  const { res } = await call("/api/onboarding", { method: "POST", cookie: aarav.cookie, json: { role: "recruiter", companyName: "X", jobTitle: "Y" } });
  assert.equal(res.status, 409);
});

await step("fake PDF (text with .pdf name) is rejected by content check", async () => {
  const { res } = await upload("resume", new Blob(["just text, not a pdf"], { type: "application/pdf" }), "cv.pdf", aarav.cookie);
  assert.equal(res.status, 415);
});

await step("oversized resume is rejected", async () => {
  const big = new Blob([Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(4 * 1024 * 1024 + 10, 32)])]);
  const { res } = await upload("resume", big, "big.pdf", aarav.cookie);
  assert.equal(res.status, 413);
});

let completionXp = null;
await step("valid resume and photo upload; profile completion XP awarded once", async () => {
  const r1 = await upload("resume", pdf("one"), "aarav-resume.pdf", aarav.cookie);
  assert.equal(r1.res.status, 200, JSON.stringify(r1.data));
  const r2 = await upload("avatar", png(), "me.png", aarav.cookie);
  assert.equal(r2.res.status, 200, JSON.stringify(r2.data));
  completionXp = r2.data.xp ?? r1.data.xp;
  assert.equal(r2.data.completion.percent, 100, `missing: ${r2.data.completion.missing}`);
  const r3 = await upload("avatar", png(), "me-again.png", aarav.cookie);
  assert.equal(r3.data.xp, null, "second completion must not award XP again");
});

await step("profile completion XP comes from the ledger, not the client", async () => {
  // Seeded students already received profile_complete XP, so the unique ledger key blocks a repeat.
  assert.ok(completionXp === null || completionXp.awarded === true);
});

await step("owner downloads own resume", async () => {
  const res = await fetch(`${BASE}/api/files/resume/${aarav.id}`, { headers: { Cookie: aarav.cookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-disposition"), /attachment/);
  assert.equal(res.headers.get("content-type"), "application/pdf");
});

await step("other students cannot download the resume", async () => {
  const res = await fetch(`${BASE}/api/files/resume/${aarav.id}`, { headers: { Cookie: riya.cookie } });
  assert.equal(res.status, 403);
});

await step("recruiter needs the student's permission to download", async () => {
  const vis = { email: false, resume: false, education: true, experience: true, projects: true, codingStats: true, assessmentScores: true, github: true, linkedin: true };
  await call("/api/profile/privacy", { method: "PATCH", cookie: aarav.cookie, json: { isPublic: true, visibility: vis } }); // start private (re-runnable)
  const before = await fetch(`${BASE}/api/files/resume/${aarav.id}`, { headers: { Cookie: priya.cookie } });
  assert.equal(before.status, 403);
  vis.resume = true;
  const { res } = await call("/api/profile/privacy", { method: "PATCH", cookie: aarav.cookie, json: { isPublic: true, visibility: vis } });
  assert.equal(res.status, 200);
  const after = await fetch(`${BASE}/api/files/resume/${aarav.id}`, { headers: { Cookie: priya.cookie } });
  assert.equal(after.status, 200);
});

await step("avatar is public", async () => {
  const res = await fetch(`${BASE}/api/files/avatar/${aarav.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/png");
});

await step("public profile hides email from anonymous visitors", async () => {
  const { res, data } = await call(`/u/${aarav.id}`);
  assert.equal(res.status, 200);
  assert.ok(data.includes("Aarav Mehta"));
  assert.ok(!data.includes("aarav@students.skillarena.test"), "email leaked");
});

await step("private profile shows not-found to others", async () => {
  const vis = { email: false, resume: false, education: true, experience: true, projects: true, codingStats: true, assessmentScores: true, github: true, linkedin: true };
  await call("/api/profile/privacy", { method: "PATCH", cookie: riya.cookie, json: { isPublic: false, visibility: vis } });
  // With streaming (Cache Components) the shell is sent before the profile check,
  // so the status stays 200; what matters is that the not-found UI is rendered
  // with noindex and none of the profile's data is in the response.
  const { data: html } = await call(`/u/${riya.id}`, { cookie: aarav.cookie });
  assert.ok(!html.includes("Riya Patel"), "private profile data leaked");
  assert.ok(html.includes("noindex"), "not-found page should be noindex");
  const own = await call(`/u/${riya.id}`, { cookie: riya.cookie });
  assert.ok(own.data.includes("Riya Patel"), "owner still sees their own profile");
});

await step("new sign-up: admin role refused, recruiter onboarding creates a company", async () => {
  const email = `smoke-${Date.now()}@example.test`;
  const { res, data } = await call("/api/auth/sign-up/email", { method: "POST", json: { email, password: PASSWORD, name: "Smoke Tester", role: "admin" } });
  assert.ok(res.status === 200 || res.status === 400, `sign-up status ${res.status}`);
  const user = await signIn(email);
  const { data: s1 } = await call("/api/auth/get-session", { cookie: user.cookie });
  assert.equal(s1.user.role, "student", `sign-up chose role (${JSON.stringify(data).slice(0, 80)})`);

  const bad = await call("/api/onboarding", { method: "POST", cookie: user.cookie, json: { role: "admin" } });
  assert.equal(bad.res.status, 422);

  const ok = await call("/api/onboarding", { method: "POST", cookie: user.cookie, json: { role: "recruiter", companyName: "Smoke Test Labs", jobTitle: "Hiring lead" } });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.data));
  const { data: s2 } = await call("/api/auth/get-session", { cookie: user.cookie });
  assert.equal(s2.user.role, "recruiter");

  const again = await call("/api/onboarding", { method: "POST", cookie: user.cookie, json: { role: "student", college: "X", graduationYear: 2027 } });
  assert.equal(again.res.status, 409);
});

// ── Phase 3: dashboard and notifications ─────────────────────────
await step("dashboard redirects signed-out visitors to /login", async () => {
  const { res } = await call("/dashboard");
  assert.ok([302, 307].includes(res.status), `status ${res.status}`);
  assert.match(res.headers.get("location"), /\/login\?next=%2Fdashboard/);
});

await step("student dashboard renders their own data", async () => {
  const { res, data } = await call("/dashboard", { cookie: riya.cookie });
  assert.equal(res.status, 200);
  assert.ok(data.includes("Coding activity") && data.includes("Recommended for you"), "dashboard sections missing");
  assert.ok(!data.includes("Aarav Mehta"), "another student's data leaked into the dashboard");
});

await step("recruiters are sent away from the student dashboard", async () => {
  const { data } = await call("/dashboard", { cookie: priya.cookie });
  assert.ok(!data.includes("Coding activity"), "recruiter saw the student dashboard");
});

await step("notifications API requires sign-in and only touches your own", async () => {
  const anon = await call("/api/notifications");
  assert.equal(anon.res.status, 401);
  const mine = await call("/api/notifications", { cookie: aarav.cookie });
  assert.equal(mine.res.status, 200);
  assert.ok(Array.isArray(mine.data.items));
  const riyas = await call("/api/notifications", { cookie: riya.cookie });
  const foreignId = riyas.data.items[0]?.id;
  if (foreignId) {
    const attempt = await call("/api/notifications", { method: "POST", cookie: aarav.cookie, json: { ids: [foreignId] } });
    assert.equal(attempt.data.updated, 0, "marked someone else's notification as read");
  }
  const bad = await call("/api/notifications", { method: "POST", cookie: aarav.cookie, json: { ids: "all", extra: 1 } });
  assert.equal(bad.res.status, 422);
});

// ── Phase 4: AlgoArena ───────────────────────────────────────────
const { REFERENCE_SOLUTIONS } = await import("./reference-solutions.mjs");
const TWO_SUM_HIDDEN_INPUT = "-1 -2 -3 -4 -5";

await step("problem library and workspace render without hidden tests", async () => {
  const lib = await call("/algoarena");
  assert.equal(lib.res.status, 200);
  assert.ok(lib.data.includes("Two sum") && lib.data.includes("Daily challenge"));
  const ws = await call("/algoarena/two-sum");
  assert.equal(ws.res.status, 200);
  assert.ok(!ws.data.includes(TWO_SUM_HIDDEN_INPUT), "hidden test input leaked into the workspace page");
});

const runProbe = await call("/api/algoarena/run", { method: "POST", cookie: aarav.cookie, json: { slug: "two-sum", language: "javascript", code: REFERENCE_SOLUTIONS["two-sum"] } });
const judgeMode = runProbe.data.executed === true;
const runnerName = (await call("/api/health")).data?.codeRunner;
console.log(`  (code runner: ${judgeMode ? (runnerName === "paiza" ? "Paiza.io" : "Judge0") : "demo mode"})`);

await step("run returns only sample tests", async () => {
  assert.equal(runProbe.res.status, 200, JSON.stringify(runProbe.data));
  assert.ok(!JSON.stringify(runProbe.data).includes(TWO_SUM_HIDDEN_INPUT), "run leaked a hidden test");
  if (judgeMode) assert.equal(runProbe.data.status, "accepted");
  else assert.match(runProbe.data.message, /not executed/i);
});

await step("submit validation and roles", async () => {
  const anon = await call("/api/algoarena/submit", { method: "POST", json: { slug: "two-sum", language: "javascript", code: "x" } });
  assert.equal(anon.res.status, 401);
  const rec = await call("/api/algoarena/submit", { method: "POST", cookie: priya.cookie, json: { slug: "two-sum", language: "javascript", code: "x" } });
  assert.equal(rec.res.status, 403, "recruiters can't submit");
  const badLang = await call("/api/algoarena/submit", { method: "POST", cookie: aarav.cookie, json: { slug: "two-sum", language: "ruby", code: "x" } });
  assert.equal(badLang.res.status, 422);
  const missing = await call("/api/algoarena/submit", { method: "POST", cookie: aarav.cookie, json: { slug: "no-such-problem", language: "python", code: "x" } });
  assert.equal(missing.res.status, 404);
});

// A brand-new student, so XP and streak changes can be checked exactly.
const freshEmail = `solver-${Date.now()}@example.test`;
await call("/api/auth/sign-up/email", { method: "POST", json: { email: freshEmail, password: PASSWORD, name: "Fresh Solver" } });
const fresh = await signIn(freshEmail);
await call("/api/onboarding", { method: "POST", cookie: fresh.cookie, json: { role: "student", college: "Test College", graduationYear: 2027 } });
const xpOf = async (who) => {
  const html = (await call(`/u/${who.id}`, { cookie: who.cookie })).data;
  const m = /<dt[^>]*>XP<\/dt><dd[^>]*>([\d,]+)<\/dd>/.exec(html);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

if (!judgeMode) {
  await step("demo-mode submit is saved as not executed and earns nothing", async () => {
    const before = await xpOf(fresh);
    const sub = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug: "two-sum", language: "javascript", code: REFERENCE_SOLUTIONS["two-sum"] } });
    assert.equal(sub.res.status, 200, JSON.stringify(sub.data));
    assert.equal(sub.data.status, "not_executed");
    assert.equal(sub.data.executed, false);
    assert.equal(await xpOf(fresh), before, "demo submission changed XP");
    const hist = await call(`/api/algoarena/submissions?problemId=${(await call("/algoarena/two-sum")).data.match(/"id":"([a-f0-9]{24})"/)?.[1] ?? ""}`, { cookie: fresh.cookie });
    if (hist.res.status === 200) assert.equal(hist.data.items[0]?.status, "not_executed");
  });
} else {
  await step("accepted first solve awards XP once; resubmitting awards nothing", async () => {
    const before = await xpOf(fresh);
    const first = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug: "two-sum", language: "javascript", code: REFERENCE_SOLUTIONS["two-sum"] } });
    assert.equal(first.data.status, "accepted", JSON.stringify(first.data));
    assert.equal(first.data.rewards.solveXp, 10);
    assert.equal(first.data.streak.current, 1);
    const again = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug: "two-sum", language: "javascript", code: REFERENCE_SOLUTIONS["two-sum"] } });
    assert.equal(again.data.status, "accepted");
    assert.equal(again.data.rewards.solveXp, 0, "XP awarded twice");
    const after = await xpOf(fresh);
    // Solve XP plus whatever the same submission unlocked: daily bonus, streak milestone, first badges.
    const extra = (first.data.rewards.dailyXp || 0) + (first.data.rewards.streakXp || 0) + (first.data.rewards.badgeXp || 0);
    assert.equal(after - before, 10 + extra, `XP went from ${before} to ${after}`);
  });

  await step("wrong answer on a sample shows input, expected and actual", async () => {
    const sub = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug: "two-sum", language: "javascript", code: 'console.log("0 0")' } });
    assert.equal(sub.data.status, "wrong_answer");
    assert.equal(sub.data.failed.hidden, false);
    assert.equal(sub.data.failed.expected, "0 1");
    assert.equal(sub.data.failed.actual.trim(), "0 0");
  });

  await step("hidden-test failure never reveals the hidden input", async () => {
    const samplesOnly = 'const s=require("fs").readFileSync(0,"utf8"); console.log(s.startsWith("4") ? "0 1" : s.startsWith("3") ? "1 2" : "0 0");';
    const sub = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug: "two-sum", language: "javascript", code: samplesOnly } });
    assert.equal(sub.data.status, "wrong_answer");
    assert.equal(sub.data.failed.hidden, true);
    assert.equal(sub.data.passed, 2);
    assert.ok(!JSON.stringify(sub.data).includes(TWO_SUM_HIDDEN_INPUT), "hidden input leaked");
    assert.equal(sub.data.failed.input, undefined);
  });

  await step("infinite loop is stopped as time limit exceeded", async () => {
    const sub = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug: "two-sum", language: "javascript", code: "while(true){}" } });
    assert.equal(sub.data.status, "time_limit_exceeded");
  });

  await step("today's daily challenge adds the bonus once", async () => {
    const page = (await call("/algoarena", { cookie: fresh.cookie })).data;
    const slug = /href="\/algoarena\/([a-z0-9-]+)"[^>]*>(?:<span[^>]*>)*Solve today/.exec(page)?.[1];
    assert.ok(slug, "couldn't find today's challenge link");
    const sub = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug, language: "javascript", code: REFERENCE_SOLUTIONS[slug] } });
    assert.equal(sub.data.status, "accepted", JSON.stringify(sub.data).slice(0, 300));
    assert.equal(sub.data.rewards.dailyXp, 15);
    const again = await call("/api/algoarena/submit", { method: "POST", cookie: fresh.cookie, json: { slug, language: "javascript", code: REFERENCE_SOLUTIONS[slug] } });
    assert.equal(again.data.rewards.dailyXp, 0, "daily bonus awarded twice");
    const after = (await call("/algoarena", { cookie: fresh.cookie })).data;
    assert.ok(after.includes("Completed today"));
  });
}

await step("submission history is private to its owner", async () => {
  const ws = (await call("/algoarena/two-sum")).data;
  const problemId = /\\"id\\":\\"([a-f0-9]{24})\\"/.exec(ws)?.[1] ?? /"id":"([a-f0-9]{24})"/.exec(ws)?.[1];
  assert.ok(problemId, "couldn't find the problem id");
  const mine = await call(`/api/algoarena/submissions?problemId=${problemId}`, { cookie: fresh.cookie });
  assert.equal(mine.res.status, 200);
  assert.ok(mine.data.items.length >= 1);
  const theirs = await call(`/api/algoarena/submissions?problemId=${problemId}`, { cookie: riya.cookie });
  assert.ok(!theirs.data.items.some((s) => mine.data.items.some((m) => m.id === s.id)), "saw another student's submissions");
});

// ── Phase 5: contests, leaderboard, progress ─────────────────────
if (process.env.MONGODB_URI) {
  const { MongoClient, ObjectId } = await import("mongodb");
  const mongo = new MongoClient(process.env.MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB || undefined);
  const problemId = async (slug) => (await db.collection("problems").findOne({ slug }, { projection: { _id: 1 } }))._id;
  const [twoSum, parens] = [await problemId("two-sum"), await problemId("valid-parentheses")];
  const stamp = Date.now();
  const now = Date.now();
  const mk = (slug, startOffsetMin, durationMin) => ({
    _id: new ObjectId(),
    slug,
    title: `Smoke ${slug.split("-")[1]} contest`,
    description: "Created by the smoke test.",
    startsAt: new Date(now + startOffsetMin * 60_000),
    endsAt: new Date(now + (startOffsetMin + durationMin) * 60_000),
    problems: [{ problemId: twoSum, points: 100, position: 0 }, { problemId: parens, points: 200, position: 1 }],
    penaltyMinutesPerWrong: 10,
    isPublished: true,
    finalizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const live = mk(`smoke-live-${stamp}`, -10, 60);
  const upcoming = mk(`smoke-upcoming-${stamp}`, 120, 60);
  const ending = mk(`smoke-ending-${stamp}`, -30, 60);
  await db.collection("contests").insertMany([live, upcoming, ending]);

  await step("contests page lists live and upcoming contests", async () => {
    const { data } = await call("/contests", { cookie: aarav.cookie });
    assert.ok(data.includes(live.title) && data.includes(upcoming.title));
    assert.ok(data.includes("Live now"));
  });

  await step("registration: students only, unregister only before start", async () => {
    const rec = await call(`/api/contests/${upcoming.slug}/registration`, { method: "POST", cookie: priya.cookie });
    assert.equal(rec.res.status, 403);
    const reg = await call(`/api/contests/${upcoming.slug}/registration`, { method: "POST", cookie: fresh.cookie });
    assert.equal(reg.res.status, 200);
    const again = await call(`/api/contests/${upcoming.slug}/registration`, { method: "POST", cookie: fresh.cookie });
    assert.equal(again.res.status, 200, "registering twice is harmless");
    assert.equal(await db.collection("contest_participants").countDocuments({ contestId: upcoming._id }), 1);
    const un = await call(`/api/contests/${upcoming.slug}/registration`, { method: "DELETE", cookie: fresh.cookie });
    assert.equal(un.res.status, 200);
    assert.equal(await db.collection("contest_participants").countDocuments({ contestId: upcoming._id }), 0);
    await call(`/api/contests/${live.slug}/registration`, { method: "POST", cookie: fresh.cookie });
    const unLive = await call(`/api/contests/${live.slug}/registration`, { method: "DELETE", cookie: fresh.cookie });
    assert.equal(unLive.res.status, 409, "can't unregister from a live contest");
  });

  await step("upcoming contest problems stay hidden", async () => {
    const page = await call(`/contests/${upcoming.slug}`);
    assert.ok(page.data.includes("Problems unlock when the contest starts"));
    assert.ok(!page.data.includes(`/contests/${upcoming.slug}/two-sum`), "problem link shown before start");
    const run = await call(`/api/contests/${upcoming.slug}/run`, { method: "POST", cookie: fresh.cookie, json: { problemSlug: "two-sum", language: "javascript", code: "x" } });
    assert.equal(run.res.status, 403);
    const ws = await call(`/contests/${upcoming.slug}/two-sum`, { cookie: fresh.cookie });
    assert.ok([200, 307].includes(ws.res.status));
    assert.ok(!ws.data.includes?.("Return the indices") , "problem statement leaked before start");
  });

  await step("live contest: problems open, submit needs registration, wrong problem is 404", async () => {
    const page = await call(`/contests/${live.slug}`, { cookie: fresh.cookie });
    assert.ok(page.data.includes(`/contests/${live.slug}/two-sum`));
    const unreg = await call(`/api/contests/${live.slug}/submit`, { method: "POST", cookie: riya.cookie, json: { problemSlug: "two-sum", language: "javascript", code: "x" } });
    assert.equal(unreg.res.status, 403);
    const notIn = await call(`/api/contests/${live.slug}/submit`, { method: "POST", cookie: fresh.cookie, json: { problemSlug: "coin-change", language: "javascript", code: "x" } });
    assert.equal(notIn.res.status, 404);
    const sub = await call(`/api/contests/${live.slug}/submit`, { method: "POST", cookie: fresh.cookie, json: { problemSlug: "two-sum", language: "javascript", code: REFERENCE_SOLUTIONS["two-sum"] } });
    assert.equal(sub.res.status, 200, JSON.stringify(sub.data));
    if (judgeMode) {
      assert.equal(sub.data.status, "accepted");
      assert.equal(sub.data.contest.score, 100);
      assert.equal(sub.data.contest.rank, 1);
    } else {
      assert.equal(sub.data.executed, false);
      assert.match(sub.data.message, /can't be judged/);
    }
  });

  await step("finished contest is finalized from its submissions: ranks, penalty, notifications", async () => {
    // Simulated judged results (no code runner needed): fresh solves both problems, Riya solves one.
    await db.collection("contest_participants").insertMany([
      { contestId: ending._id, userId: new ObjectId(fresh.id), score: 0, solvedCount: 0, penaltyMinutes: 0, submissions: 0, rank: null },
      { contestId: ending._id, userId: new ObjectId(riya.id), score: 0, solvedCount: 0, penaltyMinutes: 0, submissions: 0, rank: null },
    ]);
    const cs = (user, pid, status, minute) => ({ contestId: ending._id, userId: new ObjectId(user.id), problemId: pid, submissionId: new ObjectId(), language: "javascript", status, accepted: status === "accepted", minute, pointsAwarded: 0, createdAt: new Date(ending.startsAt.getTime() + minute * 60_000) });
    await db.collection("contest_submissions").insertMany([
      cs(fresh, twoSum, "wrong_answer", 2),
      cs(fresh, twoSum, "accepted", 5),
      cs(riya, parens, "accepted", 4),
      cs(fresh, parens, "accepted", 12),
    ]);
    await db.collection("contests").updateOne({ _id: ending._id }, { $set: { endsAt: new Date(Date.now() - 60_000) } });
    const st = await call(`/api/contests/${ending.slug}/standings`, { cookie: fresh.cookie });
    assert.equal(st.res.status, 200, JSON.stringify(st.data));
    assert.equal(st.data.state, "ended");
    const [first, second] = st.data.rows;
    assert.equal(first.userId, fresh.id);
    assert.equal(first.score, 300);
    assert.equal(first.penaltyMinutes, 5 + 10 + 12, "penalty = accept minutes + 10 per wrong");
    assert.equal(second.score, 200);
    assert.equal(second.rank, 2);
    const contestDoc = await db.collection("contests").findOne({ _id: ending._id });
    assert.ok(contestDoc.finalizedAt, "contest not finalized");
    const note = await db.collection("notifications").findOne({ userId: new ObjectId(fresh.id), title: `${ending.title} results` });
    assert.ok(note && note.body.includes("#1"), "result notification missing");
    // Finalizing twice must not duplicate notifications.
    await call(`/api/contests/${ending.slug}/standings`, { cookie: fresh.cookie });
    assert.equal(await db.collection("notifications").countDocuments({ userId: new ObjectId(fresh.id), title: `${ending.title} results` }), 1);
    const badge = await db.collection("achievements").findOne({ code: "contest-top-10" });
    assert.ok(await db.collection("user_achievements").findOne({ userId: new ObjectId(fresh.id), achievementId: badge._id }), "top-10 badge not awarded");
  });

  await step("leaderboard renders all boards and anonymises private profiles", async () => {
    const { res, data } = await call("/leaderboard");
    assert.equal(res.status, 200);
    for (const label of ["XP", "Solved", "Contests", "This week", "This month"]) assert.ok(data.includes(label), `${label} tab missing`);
    assert.ok(!data.includes("Riya Patel"), "private profile shown by name");
  });

  await step("progress page and goals: students only, validated", async () => {
    const page = await call("/achievements", { cookie: fresh.cookie });
    assert.equal(page.res.status, 200);
    assert.ok(page.data.includes("Badges") && page.data.includes("Goals"));
    const ok = await call("/api/profile/goals", { method: "PATCH", cookie: fresh.cookie, json: { weeklyProblems: 7, weeklyActiveDays: 5, monthlyXp: 800 } });
    assert.equal(ok.res.status, 200, JSON.stringify(ok.data));
    assert.equal(ok.data.profile.goals.weeklyProblems, 7);
    const bad = await call("/api/profile/goals", { method: "PATCH", cookie: fresh.cookie, json: { weeklyProblems: 7, weeklyActiveDays: 9, monthlyXp: 800 } });
    assert.equal(bad.res.status, 422);
    const rec = await call("/api/profile/goals", { method: "PATCH", cookie: priya.cookie, json: { weeklyProblems: 7, weeklyActiveDays: 5, monthlyXp: 800 } });
    assert.equal(rec.res.status, 403);
  });

  // ── Phase 6: SkillBridge ───────────────────────────────────────
  const nimbus = await db.collection("recruiter_companies").findOne({ slug: "nimbus-labs" });
  const listing = (title, extra = {}) => ({
    _id: new ObjectId(),
    title,
    companyId: nimbus._id,
    companyName: nimbus.name,
    companyDescription: nimbus.description,
    description: "Created by the smoke test.",
    type: "internship",
    workMode: "remote",
    location: "Remote",
    experienceLevel: "fresher",
    requiredSkills: ["JavaScript", "Python"],
    preferredSkills: [],
    graduationYears: [],
    applyMethod: "platform",
    source: "manual",
    status: "published",
    postedBy: new ObjectId(priya.id),
    postedAt: new Date(),
    applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });
  const open = listing(`Smoke open role ${stamp}`);
  const external = listing(`Smoke external role ${stamp}`, { applyMethod: "external", source: "remotive", externalId: `smoke-${stamp}`, applyUrl: "https://example.com/apply", companyId: null, postedBy: null });
  const closed = listing(`Smoke closed role ${stamp}`, { applicationDeadline: new Date(Date.now() - 86_400_000) });
  const batch2026 = listing(`Smoke 2026-only role ${stamp}`, { graduationYears: [2026] });
  await db.collection("opportunities").insertMany([open, external, closed, batch2026]);
  const applyForm = (choice, blob, name, cover = "") => {
    const form = new FormData();
    form.set("resumeChoice", choice);
    form.set("coverLetter", cover);
    if (blob) form.append("file", blob, name);
    return form;
  };

  await step("board: public listing, search and filters", async () => {
    const all = await call("/skillbridge");
    assert.equal(all.res.status, 200);
    assert.ok(all.data.includes(open.title) && !all.data.includes(closed.title), "closed listings must not show");
    const q = await call(`/skillbridge?q=${encodeURIComponent("Smoke open")}`);
    assert.ok(q.data.includes(open.title) && !q.data.includes("Data analyst intern"));
    const mode = await call("/skillbridge?mode=onsite");
    assert.ok(!mode.data.includes(open.title), "remote listing shown under on-site filter");
    assert.ok(!all.data.includes("% match"), "match scores shown to signed-out visitors");
  });

  await step("board for a student: match scores and personal tabs", async () => {
    const page = await call("/skillbridge", { cookie: aarav.cookie });
    assert.ok(page.data.includes("% match"));
    assert.ok(page.data.includes("For you") && page.data.includes("Saved") && page.data.includes("Applied"));
  });

  await step("save: students only, toggles and validates", async () => {
    assert.equal((await call(`/api/opportunities/${open._id}/save`, { method: "POST" })).res.status, 401);
    assert.equal((await call(`/api/opportunities/${open._id}/save`, { method: "POST", cookie: priya.cookie })).res.status, 403);
    assert.equal((await call(`/api/opportunities/${new ObjectId()}/save`, { method: "POST", cookie: fresh.cookie })).res.status, 404);
    assert.equal((await call(`/api/opportunities/${open._id}/save`, { method: "POST", cookie: fresh.cookie })).res.status, 200);
    const saved = await call("/skillbridge?tab=saved", { cookie: fresh.cookie });
    assert.ok(saved.data.includes(open.title));
    assert.equal((await call(`/api/opportunities/${open._id}/save`, { method: "DELETE", cookie: fresh.cookie })).res.status, 200);
  });

  await step("apply: guards for role, resume, batch, external and closed listings", async () => {
    const rec = await call(`/api/opportunities/${open._id}/apply`, { method: "POST", cookie: priya.cookie, form: applyForm("upload", pdf("rec"), "r.pdf") });
    assert.equal(rec.res.status, 403);
    const noResume = await call(`/api/opportunities/${open._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("profile") });
    assert.equal(noResume.res.status, 422, "profile resume required when choosing it");
    const fake = await call(`/api/opportunities/${open._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("upload", new Blob(["not a pdf"]), "cv.pdf") });
    assert.equal(fake.res.status, 415);
    const wrongBatch = await call(`/api/opportunities/${batch2026._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("upload", pdf("b"), "b.pdf") });
    assert.equal(wrongBatch.res.status, 422);
    assert.match(wrongBatch.data.error, /2026/);
    const ext = await call(`/api/opportunities/${external._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("upload", pdf("e"), "e.pdf") });
    assert.equal(ext.res.status, 409);
    const shut = await call(`/api/opportunities/${closed._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("upload", pdf("c"), "c.pdf") });
    assert.equal(shut.res.status, 409);
  });

  let freshAppId;
  await step("apply with an uploaded resume; second apply is refused; recruiter notified; badge earned", async () => {
    const ok = await call(`/api/opportunities/${open._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("upload", pdf("fresh-cv"), "fresh.pdf", "I'd love to join.") });
    assert.equal(ok.res.status, 201, JSON.stringify(ok.data));
    freshAppId = ok.data.id;
    const again = await call(`/api/opportunities/${open._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("upload", pdf("x"), "x.pdf") });
    assert.equal(again.res.status, 409);
    assert.ok(await db.collection("notifications").findOne({ userId: new ObjectId(priya.id), title: `New application for ${open.title}` }), "recruiter not notified");
    const badge = await db.collection("achievements").findOne({ code: "first-application" });
    assert.ok(await db.collection("user_achievements").findOne({ userId: new ObjectId(fresh.id), achievementId: badge._id }), "first-application badge missing");
  });

  await step("application resume: owner and listing's recruiter only", async () => {
    const own = await fetch(`${BASE}/api/applications/${freshAppId}/resume`, { headers: { Cookie: fresh.cookie } });
    assert.equal(own.status, 200);
    assert.ok((await own.text()).includes("fresh-cv"));
    assert.equal((await fetch(`${BASE}/api/applications/${freshAppId}/resume`, { headers: { Cookie: riya.cookie } })).status, 403);
    assert.equal((await fetch(`${BASE}/api/applications/${freshAppId}/resume`, { headers: { Cookie: priya.cookie } })).status, 200, "listing's recruiter should see it");
  });

  await step("profile resume is snapshotted: replacing it later doesn't change the application", async () => {
    await upload("resume", pdf("snapshot-original"), "orig.pdf", aarav.cookie);
    const app = await call(`/api/opportunities/${open._id}/apply`, { method: "POST", cookie: aarav.cookie, form: applyForm("profile") });
    assert.equal(app.res.status, 201, JSON.stringify(app.data));
    await upload("resume", pdf("snapshot-replacement"), "new.pdf", aarav.cookie);
    const body = await (await fetch(`${BASE}/api/applications/${app.data.id}/resume`, { headers: { Cookie: aarav.cookie } })).text();
    assert.ok(body.includes("snapshot-original") && !body.includes("snapshot-replacement"));
  });

  await step("withdraw: own and open only; cannot re-apply after withdrawing", async () => {
    assert.equal((await call(`/api/applications/${freshAppId}/withdraw`, { method: "POST", cookie: riya.cookie })).res.status, 404);
    const w = await call(`/api/applications/${freshAppId}/withdraw`, { method: "POST", cookie: fresh.cookie });
    assert.equal(w.res.status, 200);
    assert.equal((await call(`/api/applications/${freshAppId}/withdraw`, { method: "POST", cookie: fresh.cookie })).res.status, 409);
    const re = await call(`/api/opportunities/${open._id}/apply`, { method: "POST", cookie: fresh.cookie, form: applyForm("upload", pdf("y"), "y.pdf") });
    assert.equal(re.res.status, 409);
    assert.match(re.data.error, /withdrew/);
    const page = await call("/applications", { cookie: fresh.cookie });
    assert.ok(page.data.includes(open.title) && page.data.includes("Withdrawn"));
  });

  await step("opportunity detail: external link preserved, unknown id is not found", async () => {
    const ext = await call(`/skillbridge/${external._id}`);
    assert.ok(ext.data.includes("https://example.com/apply") && ext.data.includes("via Remotive"));
    const missing = await call(`/skillbridge/${new ObjectId()}`);
    assert.ok(missing.data.includes("noindex"));
  });

  // ── Phase 7: assessments ───────────────────────────────────────
  const correctAnswers = async (attemptId) => {
    const att = await db.collection("assessment_attempts").findOne({ _id: new ObjectId(attemptId) });
    const qs = await db.collection("questions").find({ _id: { $in: att.questionIds } }).toArray();
    const byId = new Map(qs.map((q) => [String(q._id), q]));
    return { att, answers: att.questionIds.map((id) => byId.get(String(id)).answer), explanations: qs.map((q) => q.explanation) };
  };

  await step("assessment center lists every category publicly", async () => {
    const { res, data } = await call("/assessments");
    assert.equal(res.status, 200);
    for (const label of ["Python", "Database Management Systems", "Logical Reasoning"]) assert.ok(data.includes(label), `${label} missing`);
  });

  await step("start: students only, difficulty rules, resume instead of duplicating", async () => {
    assert.equal((await call("/api/assessments/dbms-fundamentals/start", { method: "POST", json: { difficulty: "mixed" } })).res.status, 401);
    assert.equal((await call("/api/assessments/dbms-fundamentals/start", { method: "POST", cookie: priya.cookie, json: { difficulty: "mixed" } })).res.status, 403);
    assert.equal((await call("/api/assessments/dbms-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "extreme" } })).res.status, 422);
    assert.equal((await call("/api/assessments/no-such-test/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "mixed" } })).res.status, 404);
    const hard = await call("/api/assessments/dbms-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "hard" } });
    assert.equal(hard.res.status, 409, "not enough hard questions should be refused");
    const first = await call("/api/assessments/dbms-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "mixed" } });
    assert.equal(first.res.status, 200, JSON.stringify(first.data));
    const again = await call("/api/assessments/dbms-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "mixed" } });
    assert.equal(again.data.attemptId, first.data.attemptId);
    assert.equal(again.data.resumed, true);
  });

  const dbmsAttempt = (await call("/api/assessments/dbms-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "mixed" } })).data.attemptId;
  const truth = await correctAnswers(dbmsAttempt);

  await step("quiz page never contains answers or explanations", async () => {
    const { res, data } = await call(`/assessments/attempt/${dbmsAttempt}`, { cookie: fresh.cookie });
    assert.equal(res.status, 200);
    for (const e of truth.explanations.filter(Boolean)) assert.ok(!data.includes(e), `explanation leaked: ${e}`);
    assert.ok(!/\\?"answer\\?":\s*\d/.test(data), "answer index leaked into the page");
    const other = await call(`/assessments/attempt/${dbmsAttempt}`, { cookie: riya.cookie });
    assert.ok(!other.data.includes(truth.att.questionIds.length ? "Question 1 of" : "x"), "another student opened the attempt");
  });

  await step("autosave validates shape, option range and ownership", async () => {
    const n = truth.answers.length;
    assert.equal((await call(`/api/assessments/attempts/${dbmsAttempt}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: [0], flagged: [] } })).res.status, 422);
    assert.equal((await call(`/api/assessments/attempts/${dbmsAttempt}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: Array(n).fill(7), flagged: [] } })).res.status, 422);
    assert.equal((await call(`/api/assessments/attempts/${dbmsAttempt}`, { method: "PATCH", cookie: riya.cookie, json: { answers: Array(n).fill(null), flagged: [] } })).res.status, 404);
    const ok = await call(`/api/assessments/attempts/${dbmsAttempt}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: truth.answers, flagged: [0] } });
    assert.equal(ok.res.status, 200);
    assert.equal(ok.data.answered, n);
  });

  await step("submit: scored on the server, XP once, skill verified, badges, idempotent", async () => {
    const sub = await call(`/api/assessments/attempts/${dbmsAttempt}/submit`, { method: "POST", cookie: fresh.cookie });
    assert.equal(sub.res.status, 200, JSON.stringify(sub.data));
    assert.equal(sub.data.percentage, 100);
    assert.equal(sub.data.passed, true);
    assert.equal(sub.data.xpAwarded, 40 + 25);
    assert.deepEqual(sub.data.verified, ["DBMS"]);
    const prof = await db.collection("profiles").findOne({ userId: new ObjectId(fresh.id) });
    assert.ok(prof.skills.some((s) => s.name === "DBMS" && s.verified && s.source === "assessment"), "DBMS not verified on profile");
    const again = await call(`/api/assessments/attempts/${dbmsAttempt}/submit`, { method: "POST", cookie: fresh.cookie });
    assert.equal(again.data.alreadySubmitted, true);
    assert.equal((await call(`/api/assessments/attempts/${dbmsAttempt}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: truth.answers, flagged: [] } })).res.status, 409);
    const badge = await db.collection("achievements").findOne({ code: "assessment-90" });
    assert.ok(await db.collection("user_achievements").findOne({ userId: new ObjectId(fresh.id), achievementId: badge._id }), "assessment-90 badge missing");
  });

  await step("results page shows answers and explanations after submitting", async () => {
    const { data } = await call(`/assessments/attempt/${dbmsAttempt}`, { cookie: fresh.cookie });
    assert.ok(data.includes("Correct answer") && data.includes(truth.explanations[0]));
    assert.ok(data.includes("Topic-wise score"));
  });

  await step("retaking with a perfect score earns no extra XP", async () => {
    const retake = await call("/api/assessments/dbms-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "mixed" } });
    assert.notEqual(retake.data.attemptId, dbmsAttempt);
    const t2 = await correctAnswers(retake.data.attemptId);
    await call(`/api/assessments/attempts/${retake.data.attemptId}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: t2.answers, flagged: [] } });
    const sub = await call(`/api/assessments/attempts/${retake.data.attemptId}/submit`, { method: "POST", cookie: fresh.cookie });
    assert.equal(sub.data.percentage, 100);
    assert.equal(sub.data.xpAwarded, 0);
  });

  await step("wrong answers fail the test; unanswered count as wrong", async () => {
    const start = await call("/api/assessments/oop-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "mixed" } });
    const t = await correctAnswers(start.data.attemptId);
    const wrong = t.answers.map((a, i) => (i === 0 ? a : i === 1 ? null : (a + 1) % 4));
    await call(`/api/assessments/attempts/${start.data.attemptId}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: wrong, flagged: [] } });
    const sub = await call(`/api/assessments/attempts/${start.data.attemptId}/submit`, { method: "POST", cookie: fresh.cookie });
    assert.equal(sub.data.percentage, Math.round((1 / t.answers.length) * 100));
    assert.equal(sub.data.passed, false);
    assert.equal(sub.data.xpAwarded, 0);
    assert.deepEqual(sub.data.verified, []);
  });

  await step("time running out auto-submits with the saved answers", async () => {
    const start = await call("/api/assessments/os-fundamentals/start", { method: "POST", cookie: fresh.cookie, json: { difficulty: "mixed" } });
    const t = await correctAnswers(start.data.attemptId);
    await call(`/api/assessments/attempts/${start.data.attemptId}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: t.answers, flagged: [] } });
    await db.collection("assessment_attempts").updateOne({ _id: new ObjectId(start.data.attemptId) }, { $set: { expiresAt: new Date(Date.now() - 60_000) } });
    assert.equal((await call(`/api/assessments/attempts/${start.data.attemptId}`, { method: "PATCH", cookie: fresh.cookie, json: { answers: t.answers, flagged: [] } })).res.status, 409);
    const page = await call(`/assessments/attempt/${start.data.attemptId}`, { cookie: fresh.cookie });
    assert.ok(page.data.includes("Submitted when time ran out") && page.data.includes("100%"));
    const doc = await db.collection("assessment_attempts").findOne({ _id: new ObjectId(start.data.attemptId) });
    assert.equal(doc.status, "expired");
  });

  await step("performance analysis appears for the student", async () => {
    const { data } = await call("/assessments", { cookie: fresh.cookie });
    assert.ok(data.includes("Your performance") && data.includes("Skill proficiency") && data.includes("Expert"));
  });

  // ── Phase 8: recruiter portal ──────────────────────────────────
  const arjun = await signIn("arjun@recruiters.skillarena.test");
  const listingBody = (extra = {}) => ({
    title: `Smoke React developer intern ${stamp}`,
    description: "Build UI with React. Created by the smoke test.",
    type: "internship",
    workMode: "remote",
    location: "Remote",
    experienceLevel: "fresher",
    requiredSkills: ["React", "Python"],
    preferredSkills: [],
    eligibility: "",
    graduationYears: [],
    salaryMin: "20000",
    salaryMax: "25000",
    salaryPeriod: "month",
    applicationDeadline: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    status: "published",
    ...extra,
  });

  await step("recruiter portal: recruiters only", async () => {
    const page = await call("/recruiter", { cookie: priya.cookie });
    assert.ok(page.data.includes("Nimbus Labs") && page.data.includes("Pipeline"));
    const student = await call("/recruiter", { cookie: aarav.cookie });
    assert.ok(!String(student.data).includes("Pipeline"), "student saw the recruiter overview");
    assert.equal((await call("/api/recruiter/listings", { method: "POST", cookie: aarav.cookie, json: listingBody() })).res.status, 403);
    assert.equal((await call("/api/recruiter/listings", { method: "POST", json: listingBody() })).res.status, 401);
  });

  await step("company profile: validated updates", async () => {
    const bad = await call("/api/recruiter/company", { method: "PATCH", cookie: priya.cookie, json: { name: "Nimbus Labs", size: "huge" } });
    assert.equal(bad.res.status, 422);
    const js = await call("/api/recruiter/company", { method: "PATCH", cookie: priya.cookie, json: { name: "Nimbus Labs", size: "11-50", website: "javascript:alert(1)" } });
    assert.equal(js.res.status, 422);
    const ok = await call("/api/recruiter/company", { method: "PATCH", cookie: priya.cookie, json: { name: "Nimbus Labs", size: "11-50", website: "https://nimbus.example.com", industry: "Developer tools", location: "Bengaluru, India", description: nimbus.description } });
    assert.equal(ok.res.status, 200, JSON.stringify(ok.data));
    assert.equal(ok.data.isVerified, true, "recruiters can't change verification");
  });

  let reactListing;
  await step("verified company publishes immediately and matching students are notified", async () => {
    const res = await call("/api/recruiter/listings", { method: "POST", cookie: priya.cookie, json: listingBody() });
    assert.equal(res.res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.status, "published");
    reactListing = res.data.id;
    assert.ok((await call("/skillbridge")).data.includes(`Smoke React developer intern ${stamp}`));
    const note = await db.collection("notifications").findOne({ userId: new ObjectId(aarav.id), title: `New match: Smoke React developer intern ${stamp}` });
    assert.ok(note, "matching student not notified");
    const bad = await call("/api/recruiter/listings", { method: "POST", cookie: priya.cookie, json: listingBody({ requiredSkills: [] }) });
    assert.equal(bad.res.status, 422);
  });

  await step("unverified company: listing waits for review and isn't public", async () => {
    const quill = await db.collection("recruiter_companies").findOne({ slug: "quillpay" });
    await db.collection("recruiter_companies").updateOne({ _id: quill._id }, { $set: { isVerified: false } });
    const res = await call("/api/recruiter/listings", { method: "POST", cookie: arjun.cookie, json: listingBody({ title: `Smoke pending role ${stamp}` }) });
    await db.collection("recruiter_companies").updateOne({ _id: quill._id }, { $set: { isVerified: true } });
    assert.equal(res.data.status, "pending_review");
    assert.ok(!(await call("/skillbridge")).data.includes(`Smoke pending role ${stamp}`));
  });

  await step("recruiters can't touch another company's listings", async () => {
    assert.equal((await call(`/api/recruiter/listings/${reactListing}`, { method: "PATCH", cookie: arjun.cookie, json: listingBody({ title: "Hijacked" }) })).res.status, 404);
    assert.equal((await call(`/api/recruiter/listings/${reactListing}`, { method: "DELETE", cookie: arjun.cookie })).res.status, 404);
    assert.equal((await call(`/api/recruiter/listings/${reactListing}/state`, { method: "POST", cookie: arjun.cookie, json: { action: "close" } })).res.status, 404);
    const page = await call(`/recruiter/listings/${reactListing}`, { cookie: arjun.cookie });
    assert.ok(page.data.includes("noindex"), "other recruiter opened the pipeline");
  });

  await step("listing lifecycle: close, reopen, draft deletion", async () => {
    assert.equal((await call(`/api/recruiter/listings/${reactListing}/state`, { method: "POST", cookie: priya.cookie, json: { action: "close" } })).data.status, "closed");
    assert.equal((await call(`/api/recruiter/listings/${reactListing}/state`, { method: "POST", cookie: priya.cookie, json: { action: "close" } })).res.status, 409);
    assert.equal((await call(`/api/recruiter/listings/${reactListing}/state`, { method: "POST", cookie: priya.cookie, json: { action: "reopen" } })).data.status, "published");
    const draft = await call("/api/recruiter/listings", { method: "POST", cookie: priya.cookie, json: listingBody({ title: `Smoke draft ${stamp}`, status: "draft" }) });
    assert.equal(draft.data.status, "draft");
    assert.equal((await call(`/api/recruiter/listings/${draft.data.id}`, { method: "DELETE", cookie: priya.cookie })).res.status, 200);
  });

  let aaravApp;
  let riyaApp;
  await step("pipeline: applicant detail for the owner only; listings with applicants can't be deleted", async () => {
    const a = await call(`/api/opportunities/${reactListing}/apply`, { method: "POST", cookie: aarav.cookie, form: applyForm("profile", null, null, "Keen to build UI.") });
    assert.equal(a.res.status, 201, JSON.stringify(a.data));
    aaravApp = a.data.id;
    const r = await call(`/api/opportunities/${reactListing}/apply`, { method: "POST", cookie: riya.cookie, form: applyForm("upload", pdf("riya"), "riya.pdf") });
    assert.equal(r.res.status, 201, JSON.stringify(r.data));
    riyaApp = r.data.id;
    const detail = await call(`/api/recruiter/applications/${aaravApp}`, { cookie: priya.cookie });
    assert.equal(detail.res.status, 200);
    assert.equal(detail.data.email, null, "email shared before shortlisting");
    assert.ok(detail.data.candidate.coding && detail.data.match.score > 0);
    assert.equal((await call(`/api/recruiter/applications/${aaravApp}`, { cookie: arjun.cookie })).res.status, 404);
    assert.equal((await call(`/api/recruiter/listings/${reactListing}`, { method: "DELETE", cookie: priya.cookie })).res.status, 409);
    const board = await call(`/recruiter/listings/${reactListing}`, { cookie: priya.cookie });
    const names = await db.collection("profiles").find({ userId: { $in: [new ObjectId(aarav.id), new ObjectId(riya.id)] } }, { projection: { fullName: 1 } }).toArray();
    for (const n of names) assert.ok(board.data.includes(n.fullName), `${n.fullName} missing from the pipeline`);
  });

  await step("status changes are validated and notify the student", async () => {
    assert.equal((await call(`/api/recruiter/applications/${aaravApp}/status`, { method: "POST", cookie: priya.cookie, json: { status: "applied" } })).res.status, 422);
    assert.equal((await call(`/api/recruiter/applications/${aaravApp}/status`, { method: "POST", cookie: priya.cookie, json: { status: "interview_scheduled" } })).res.status, 422);
    assert.equal((await call(`/api/recruiter/applications/${aaravApp}/status`, { method: "POST", cookie: arjun.cookie, json: { status: "rejected" } })).res.status, 404);
    const s = await call(`/api/recruiter/applications/${aaravApp}/status`, { method: "POST", cookie: priya.cookie, json: { status: "shortlisted", note: "Strong React projects." } });
    assert.equal(s.res.status, 200, JSON.stringify(s.data));
    const note = await db.collection("notifications").findOne({ userId: new ObjectId(aarav.id), title: { $regex: `Smoke React developer intern ${stamp}: Shortlisted` } });
    assert.ok(note && note.body.includes("Strong React projects."));
    const iv = await call(`/api/recruiter/applications/${aaravApp}/status`, { method: "POST", cookie: priya.cookie, json: { status: "interview_scheduled", interviewAt: new Date(Date.now() + 3 * 86_400_000).toISOString() } });
    assert.equal(iv.data.status, "interview_scheduled");
  });

  await step("contact: email and messages only after shortlisting", async () => {
    assert.equal((await call(`/api/recruiter/applications/${riyaApp}/message`, { method: "POST", cookie: priya.cookie, json: { body: "Hi" } })).res.status, 409);
    const msg = await call(`/api/recruiter/applications/${aaravApp}/message`, { method: "POST", cookie: priya.cookie, json: { body: "Please bring your portfolio." } });
    assert.equal(msg.res.status, 200);
    const detail = await call(`/api/recruiter/applications/${aaravApp}`, { cookie: priya.cookie });
    assert.equal(detail.data.email, "aarav@students.skillarena.test");
    const mine = await call("/applications", { cookie: aarav.cookie });
    assert.ok(mine.data.includes("Please bring your portfolio.") && mine.data.includes("Strong React projects."));
  });

  await step("withdrawn applications are frozen for the recruiter", async () => {
    await call(`/api/applications/${riyaApp}/withdraw`, { method: "POST", cookie: riya.cookie });
    assert.equal((await call(`/api/recruiter/applications/${riyaApp}/status`, { method: "POST", cookie: priya.cookie, json: { status: "shortlisted" } })).res.status, 409);
  });

  await step("student search respects privacy and verified skills", async () => {
    const res = await call("/recruiter/students?skills=DBMS&verified=1", { cookie: priya.cookie });
    assert.ok(res.data.includes("Fresh Solver"), "verified DBMS student missing");
    const riyaProfile = await db.collection("profiles").findOne({ userId: new ObjectId(riya.id) });
    assert.equal(riyaProfile.isPublic, false);
    assert.ok(!res.data.includes(riyaProfile.fullName), "private profile appeared in search");
    const studentTry = await call("/recruiter/students", { cookie: aarav.cookie });
    assert.ok(!String(studentTry.data).includes("Students with public profiles"), "student opened recruiter search");
    const dev = await db.collection("user").findOne({ email: "dev@students.skillarena.test" });
    await db.collection("profiles").updateOne({ userId: dev._id }, { $set: { isPublic: false } });
    const hidden = await call(`/recruiter/students/${dev._id}`, { cookie: priya.cookie });
    await db.collection("profiles").updateOne({ userId: dev._id }, { $set: { isPublic: true } });
    assert.ok(hidden.data.includes("noindex"), "private non-applicant profile opened");
    const applicant = await call(`/recruiter/students/${aarav.id}`, { cookie: priya.cookie });
    assert.ok(applicant.data.includes("Applied to your listings"));
  });

  // ── Phase 9: admin module ──────────────────────────────────────
  const admin = await signIn("admin@skillarena.test");
  const quill = await db.collection("recruiter_companies").findOne({ slug: "quillpay" });
  const arjunUser = await db.collection("user").findOne({ email: "arjun@recruiters.skillarena.test" });
  const adminPost = (path, json, cookie = admin.cookie, method = "POST") => call(path, { method, cookie, json });

  await step("admin console: admins only", async () => {
    const page = await call("/admin", { cookie: admin.cookie });
    assert.ok(page.data.includes("Review queue") && page.data.includes("New sign-ups"), "admin overview missing");
    const student = await call("/admin", { cookie: aarav.cookie });
    assert.ok(!String(student.data).includes("Review queue"), "student saw the admin console");
    assert.equal((await adminPost("/api/admin/companies/" + quill._id, { action: "verify" }, priya.cookie)).res.status, 403);
    assert.equal((await call("/api/admin/companies/" + quill._id, { method: "POST", json: { action: "verify" } })).res.status, 401);
    const signedOut = await call("/admin");
    assert.ok([302, 307].includes(signedOut.res.status), "signed-out visitor not redirected");
  });

  let pendingId;
  await step("listing moderation: send back with a note, resubmit, approve, take down", async () => {
    await db.collection("recruiter_companies").updateOne({ _id: quill._id }, { $set: { isVerified: false } });
    try {
      const created = await call("/api/recruiter/listings", { method: "POST", cookie: arjun.cookie, json: listingBody({ title: `Smoke moderated role ${stamp}` }) });
      assert.equal(created.data.status, "pending_review");
      pendingId = created.data.id;
      assert.ok((await call("/admin/opportunities", { cookie: admin.cookie })).data.includes(`Smoke moderated role ${stamp}`), "pending listing not in the moderation list");
      assert.equal((await adminPost(`/api/admin/listings/${pendingId}`, { action: "reject" })).res.status, 422, "send back without a note");
      const back = await adminPost(`/api/admin/listings/${pendingId}`, { action: "reject", note: "Add the stipend range." });
      assert.equal(back.data.status, "rejected");
      const note = await db.collection("notifications").findOne({ userId: arjunUser._id, title: `Changes needed: Smoke moderated role ${stamp}` });
      assert.ok(note?.body.includes("Add the stipend range."), "recruiter not told why");
      const listings = await call("/recruiter/listings", { cookie: arjun.cookie });
      assert.ok(listings.data.includes("Add the stipend range."), "admin note not shown to the recruiter");
      const resubmit = await call(`/api/recruiter/listings/${pendingId}/state`, { method: "POST", cookie: arjun.cookie, json: { action: "publish" } });
      assert.equal(resubmit.data.status, "pending_review");
      assert.equal((await adminPost(`/api/admin/listings/${pendingId}`, { action: "approve" })).data.status, "published");
      assert.equal((await adminPost(`/api/admin/listings/${pendingId}`, { action: "approve" })).res.status, 409, "approved twice");
      assert.ok((await call("/skillbridge")).data.includes(`Smoke moderated role ${stamp}`), "approved listing not public");
      const down = await adminPost(`/api/admin/listings/${pendingId}`, { action: "take_down", note: "Duplicate posting." });
      assert.equal(down.data.status, "rejected");
      assert.ok(!(await call("/skillbridge")).data.includes(`Smoke moderated role ${stamp}`), "taken-down listing still public");
    } finally {
      await db.collection("recruiter_companies").updateOne({ _id: quill._id }, { $set: { isVerified: true, reviewedAt: null } });
    }
  });

  await step("company verification: verify, remove, owner notified; recruiters can't verify themselves", async () => {
    await db.collection("recruiter_companies").updateOne({ _id: quill._id }, { $set: { isVerified: false, reviewedAt: null } });
    const list = await call("/admin/companies", { cookie: admin.cookie });
    assert.ok(list.data.includes("Quillpay"), "unverified company not awaiting a check");
    assert.equal((await adminPost(`/api/admin/companies/${quill._id}`, { action: "verify" })).data.isVerified, true);
    assert.equal((await adminPost(`/api/admin/companies/${quill._id}`, { action: "verify" })).res.status, 409);
    assert.ok(await db.collection("notifications").findOne({ userId: arjunUser._id, title: "Quillpay is verified" }));
    assert.equal((await adminPost(`/api/admin/companies/${quill._id}`, { action: "unverify", note: "Domain check failed." })).data.isVerified, false);
    assert.equal((await adminPost(`/api/admin/companies/${quill._id}`, { action: "verify" })).data.isVerified, true);
    const self = await call("/api/recruiter/company", { method: "PATCH", cookie: arjun.cookie, json: { name: "Quillpay", size: "11-50", isVerified: true } });
    assert.equal(self.res.status, 422, "recruiter set verification");
  });

  let throwaway;
  await step("users: role switches need a company for recruiters; admins can't change themselves", async () => {
    const email = `admin-smoke-${stamp}@example.test`;
    const signup = await call("/api/auth/sign-up/email", { method: "POST", json: { email, password: PASSWORD, name: "Role Switcher" } });
    assert.equal(signup.res.status, 200, JSON.stringify(signup.data));
    throwaway = { cookie: signup.res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; "), id: signup.data.user.id, email };
    await call("/api/onboarding", { method: "POST", cookie: throwaway.cookie, json: { role: "student", college: "Smoke College", graduationYear: 2027 } });
    assert.equal((await adminPost(`/api/admin/users/${admin.id}/role`, { role: "student" })).res.status, 409, "admin changed own role");
    assert.equal((await adminPost(`/api/admin/users/${throwaway.id}/role`, { role: "admin" })).res.status, 422, "console granted admin");
    assert.equal((await adminPost(`/api/admin/users/${throwaway.id}/role`, { role: "recruiter" })).res.status, 422, "recruiter without a company");
    const toRecruiter = await adminPost(`/api/admin/users/${throwaway.id}/role`, { role: "recruiter", companyName: `Smoke Switch Co ${stamp}` });
    assert.equal(toRecruiter.res.status, 200, JSON.stringify(toRecruiter.data));
    const { data: s } = await call("/api/auth/get-session", { cookie: throwaway.cookie });
    assert.equal(s.user.role, "recruiter");
    assert.ok((await call("/recruiter", { cookie: throwaway.cookie })).data.includes(`Smoke Switch Co ${stamp}`), "new company not linked");
    assert.equal((await adminPost(`/api/admin/users/${throwaway.id}/role`, { role: "student" })).res.status, 200);
    const users = await call(`/admin/users?q=${encodeURIComponent(email)}`, { cookie: admin.cookie });
    assert.ok(users.data.includes("Role Switcher"), "user search");
  });

  await step("suspension signs the user out, blocks sign-in, and can be undone", async () => {
    assert.equal((await adminPost(`/api/admin/users/${throwaway.id}/suspend`, { suspended: true })).res.status, 422, "suspended without a reason");
    assert.equal((await adminPost(`/api/admin/users/${admin.id}/suspend`, { suspended: true, reason: "x" })).res.status, 409, "admin suspended themselves");
    const s = await adminPost(`/api/admin/users/${throwaway.id}/suspend`, { suspended: true, reason: "Smoke test" });
    assert.equal(s.res.status, 200, JSON.stringify(s.data));
    const { data: session } = await call("/api/auth/get-session", { cookie: throwaway.cookie });
    assert.ok(!session?.user, "old session still works");
    assert.equal((await call("/api/notifications", { cookie: throwaway.cookie })).res.status, 401);
    let blocked = await call("/api/auth/sign-in/email", { method: "POST", json: { email: throwaway.email, password: PASSWORD } });
    if (blocked.res.status === 429) {
      // The sign-in rate limit (8 a minute) is shared with the earlier sign-ins; wait it out once.
      await new Promise((r) => setTimeout(r, (Number(blocked.res.headers.get("x-retry-after")) + 1) * 1000));
      blocked = await call("/api/auth/sign-in/email", { method: "POST", json: { email: throwaway.email, password: PASSWORD } });
    }
    assert.ok([401, 403].includes(blocked.res.status) && !blocked.res.headers.getSetCookie().some((c) => c.includes("session_token=") && !c.includes("Max-Age=0")), `suspended sign-in status ${blocked.res.status}`);
    assert.equal((await adminPost(`/api/admin/users/${throwaway.id}/suspend`, { suspended: false })).res.status, 200);
    const restored = await db.collection("user").findOne({ email: throwaway.email });
    assert.equal(restored.banned, false);
  });

  await step("reports: validated, one per item, dismiss and take-down notify reporters", async () => {
    assert.equal((await call("/api/reports", { method: "POST", json: { entityType: "opportunity", entityId: reactListing, reason: "spam" } })).res.status, 401);
    assert.equal((await call("/api/reports", { method: "POST", cookie: aarav.cookie, json: { entityType: "opportunity", entityId: reactListing, reason: "other" } })).res.status, 422, "other without details");
    assert.equal((await call("/api/reports", { method: "POST", cookie: aarav.cookie, json: { entityType: "profile", entityId: aarav.id, reason: "spam" } })).res.status, 409, "reported own profile");
    assert.equal((await call("/api/reports", { method: "POST", cookie: aarav.cookie, json: { entityType: "profile", entityId: riya.id, reason: "spam" } })).res.status, 404, "reported a private profile");
    const used = await db.collection("assessment_attempts").distinct("questionIds", { userId: new ObjectId(aarav.id) });
    const unseen = await db.collection("questions").findOne({ _id: { $nin: used } });
    assert.equal((await call("/api/reports", { method: "POST", cookie: aarav.cookie, json: { entityType: "question", entityId: String(unseen._id), reason: "incorrect" } })).res.status, 404, "reported an unseen question");

    const first = await call("/api/reports", { method: "POST", cookie: aarav.cookie, json: { entityType: "opportunity", entityId: reactListing, reason: "misleading", details: "Stipend differs from the call." } });
    assert.equal(first.res.status, 201, JSON.stringify(first.data));
    assert.equal((await call("/api/reports", { method: "POST", cookie: aarav.cookie, json: { entityType: "opportunity", entityId: reactListing, reason: "spam" } })).res.status, 409, "duplicate report");
    const report = await db.collection("content_reports").findOne({ reporterId: new ObjectId(aarav.id), entityId: new ObjectId(reactListing) });
    assert.ok((await call("/admin/reports", { cookie: admin.cookie })).data.includes("Stipend differs from the call."));
    assert.equal((await adminPost(`/api/admin/reports/${report._id}`, { action: "dismiss" })).data.status, "dismissed");
    assert.equal((await adminPost(`/api/admin/reports/${report._id}`, { action: "dismiss" })).res.status, 409);
    assert.ok(await db.collection("notifications").findOne({ userId: new ObjectId(aarav.id), title: "Thanks for your report", body: { $regex: "didn't find a problem" } }));

    // Two people report the same listing; taking it down resolves both.
    const kabir = await db.collection("user").findOne({ email: "kabir@students.skillarena.test" });
    await db.collection("content_reports").insertOne({ reporterId: kabir._id, entityType: "opportunity", entityId: new ObjectId(reactListing), reason: "spam", status: "open", createdAt: new Date(), updatedAt: new Date() });
    const second = await call("/api/reports", { method: "POST", cookie: riya.cookie, json: { entityType: "opportunity", entityId: reactListing, reason: "inappropriate" } });
    assert.equal(second.res.status, 201);
    const riyaReport = await db.collection("content_reports").findOne({ reporterId: new ObjectId(riya.id), entityId: new ObjectId(reactListing) });
    const acted = await adminPost(`/api/admin/reports/${riyaReport._id}`, { action: "action", note: "Removed after review." });
    assert.equal(acted.data.resolved, 2, JSON.stringify(acted.data));
    const opp = await db.collection("opportunities").findOne({ _id: new ObjectId(reactListing) });
    assert.equal(opp.status, "rejected");
    assert.equal(opp.moderationNote, "Removed after review.");
  });

  let newProblem;
  await step("problems: validated, drafts hidden, hidden tests admin-only, delete only when unused", async () => {
    const slug = `smoke-sum-${stamp}`;
    const body = {
      title: `Smoke Sum ${stamp}`, slug, difficulty: "easy", description: "Print a + b.", inputFormat: "Two integers a and b on one line.", outputFormat: "Their sum.",
      constraints: "", topics: ["Math"], concepts: [], hints: [], samples: [{ input: "1 2", output: "3", explanation: "" }], hiddenTests: [{ input: "40000 2345", output: "42345", explanation: "" }],
      timeComplexity: "O(1)", spaceComplexity: "", xpReward: 10, isInterview: false, isPublished: false,
    };
    assert.equal((await adminPost("/api/admin/problems", { ...body, hiddenTests: [] })).res.status, 422, "problem without hidden tests");
    assert.equal((await adminPost("/api/admin/problems", { ...body, slug: "Bad Slug!" })).res.status, 422);
    const created = await adminPost("/api/admin/problems", body);
    assert.equal(created.res.status, 201, JSON.stringify(created.data));
    newProblem = created.data.id;
    assert.equal((await adminPost("/api/admin/problems", body)).res.status, 409, "duplicate slug");
    assert.ok(!(await call("/algoarena")).data.includes(`Smoke Sum ${stamp}`), "draft listed in AlgoArena");
    assert.ok((await call(`/algoarena/${slug}`)).data.includes("noindex"), "draft opened in AlgoArena");
    const full = await call(`/api/admin/problems/${newProblem}`, { cookie: admin.cookie });
    assert.equal(full.data.hiddenTests[0].output, "42345");
    assert.equal((await call(`/api/admin/problems/${newProblem}`, { cookie: aarav.cookie })).res.status, 403);
    assert.equal((await adminPost(`/api/admin/problems/${newProblem}`, { isPublished: true })).data.isPublished, true);
    const page = await call(`/algoarena/${slug}`);
    assert.ok(page.data.includes(`Smoke Sum ${stamp}`) && !page.data.includes("42345"), "published problem missing or hidden test leaked");
    const edited = await adminPost(`/api/admin/problems/${newProblem}`, { ...body, timeComplexity: "", isPublished: true }, admin.cookie, "PATCH");
    assert.equal(edited.res.status, 200);
    assert.equal((await db.collection("problems").findOne({ _id: new ObjectId(newProblem) })).timeComplexity, null, "cleared field kept its old value");
    const usedProblem = await db.collection("problem_submissions").findOne({});
    assert.equal((await adminPost(`/api/admin/problems/${usedProblem.problemId}`, null, admin.cookie, "DELETE")).res.status, 409, "deleted a problem with submissions");
  });

  await step("question bank: answer must match an option; answered questions can't be deleted", async () => {
    const q = { category: "dbms", topic: "Keys", difficulty: "easy", prompt: `Smoke: which key uniquely identifies a row? ${stamp}`, options: ["Primary key", "Foreign key", "Index"], answer: 0, explanation: "", isActive: true };
    assert.equal((await adminPost("/api/admin/questions", { ...q, answer: 5 })).res.status, 422);
    assert.equal((await adminPost("/api/admin/questions", { ...q, options: ["A", "a"] })).res.status, 422, "duplicate options");
    const created = await adminPost("/api/admin/questions", q);
    assert.equal(created.res.status, 201, JSON.stringify(created.data));
    const off = await adminPost(`/api/admin/questions/${created.data.id}`, { ...q, isActive: false }, admin.cookie, "PATCH");
    assert.equal(off.res.status, 200);
    assert.equal((await db.collection("questions").findOne({ _id: new ObjectId(created.data.id) })).isActive, false);
    assert.ok((await call(`/admin/questions?q=${encodeURIComponent(stamp)}`, { cookie: admin.cookie })).data.includes("which key uniquely identifies"));
    assert.equal((await adminPost(`/api/admin/questions/${created.data.id}`, null, admin.cookie, "DELETE")).res.status, 200);
    const answered = await db.collection("assessment_attempts").findOne({ "questionIds.0": { $exists: true } });
    assert.equal((await adminPost(`/api/admin/questions/${answered.questionIds[0]}`, null, admin.cookie, "DELETE")).res.status, 409);
  });

  await step("contests: future start, unique problems, locked once started", async () => {
    const soon = Date.now() + 2 * 86_400_000;
    const body = { title: `Smoke Cup ${stamp}`, slug: `smoke-cup-${stamp}`, description: "", startsAt: new Date(soon).toISOString(), endsAt: new Date(soon + 2 * 3_600_000).toISOString(), penaltyMinutesPerWrong: 10, problems: [{ problemId: newProblem, points: 100 }], isPublished: false };
    assert.equal((await adminPost("/api/admin/contests", { ...body, startsAt: new Date(Date.now() - 60_000).toISOString() })).res.status, 422, "past start");
    assert.equal((await adminPost("/api/admin/contests", { ...body, problems: [body.problems[0], body.problems[0]] })).res.status, 422, "duplicate problem");
    assert.equal((await adminPost("/api/admin/contests", { ...body, endsAt: body.startsAt })).res.status, 422);
    const created = await adminPost("/api/admin/contests", body);
    assert.equal(created.res.status, 201, JSON.stringify(created.data));
    assert.equal((await adminPost(`/api/admin/contests/${created.data.id}`, { ...body, penaltyMinutesPerWrong: 5 }, admin.cookie, "PATCH")).res.status, 200);
    assert.ok(!(await call("/contests")).data.includes(`Smoke Cup ${stamp}`), "unpublished contest listed");
    assert.equal((await adminPost(`/api/admin/contests/${created.data.id}`, null, admin.cookie, "DELETE")).res.status, 200);

    const ended = await db.collection("contests").findOne({ endsAt: { $lt: new Date() } });
    const edit = {
      title: ended.title, slug: ended.slug, description: ended.description ?? "", startsAt: ended.startsAt.toISOString(), endsAt: ended.endsAt.toISOString(),
      penaltyMinutesPerWrong: ended.penaltyMinutesPerWrong, isPublished: true,
      problems: [...ended.problems].sort((a, b) => a.position - b.position).map((p) => ({ problemId: String(p.problemId), points: p.points })),
    };
    assert.equal((await adminPost(`/api/admin/contests/${ended._id}`, { ...edit, penaltyMinutesPerWrong: edit.penaltyMinutesPerWrong + 1 }, admin.cookie, "PATCH")).res.status, 409, "edited scoring of an ended contest");
    assert.equal((await adminPost(`/api/admin/contests/${ended._id}`, { ...edit, endsAt: new Date(Date.now() + 3_600_000).toISOString() }, admin.cookie, "PATCH")).res.status, 409, "reopened an ended contest");
    assert.equal((await adminPost(`/api/admin/contests/${ended._id}`, { ...edit, title: `${ended.title} ` }, admin.cookie, "PATCH")).res.status, 200, "title edit on an ended contest");
    assert.equal((await adminPost(`/api/admin/contests/${ended._id}`, null, admin.cookie, "DELETE")).res.status, 409);
  });

  await step("admin actions are logged and shown on the overview", async () => {
    const n = await db.collection("activity_logs").countDocuments({ userId: new ObjectId(admin.id), action: /^admin\./ });
    assert.ok(n >= 10, `only ${n} admin actions logged`);
    assert.ok((await call("/admin", { cookie: admin.cookie })).data.includes("Recent admin actions"));
  });

  // SMOKE_OFFLINE=1 (CI) skips the live third-party calls: Remotive asks for only a few requests a day.
  if (process.env.SMOKE_OFFLINE === "1") {
    console.log("  (Phase 10 live external checks skipped: SMOKE_OFFLINE=1)");
  } else {
    // ── Phase 10: external APIs (live network) ─────────────────────
    // Needs the server started with CRON_SECRET (and CRON_SECRET set here too).
    // Each live check verifies real data when the service answers, and the
    // fallback (error recorded, nothing lost, page still renders) when it doesn't.
    const CRON = process.env.CRON_SECRET;
    const liveNotes = [];
    await step("cron endpoint: secret required; due boards import or record the failure; intervals respected", async () => {
      if (!CRON) throw new Error("set CRON_SECRET for this check (same value as the server)");
      assert.equal((await call("/api/cron/sync-jobs")).res.status, 401);
      const wrong = await fetch(`${BASE}/api/cron/sync-jobs`, { headers: { Authorization: "Bearer nope" } });
      assert.equal(wrong.status, 401);
      const before = await db.collection("opportunities").countDocuments({ source: { $in: ["remotive", "arbeitnow"] }, status: "published" });
      const run = await fetch(`${BASE}/api/cron/sync-jobs`, { headers: { Authorization: `Bearer ${CRON}` } }).then((r) => r.json());
      for (const key of ["remotive", "arbeitnow"]) {
        const r = run[key];
        if (r?.ok) {
          assert.ok(r.stats.fetched > 0, `${key} returned no jobs`);
          liveNotes.push(`${key}: imported (${r.stats.fetched} fetched, ${r.stats.kept} kept)`);
        } else if (r?.skipped) {
          liveNotes.push(`${key}: skipped (${r.skipped}, synced recently)`);
        } else {
          const row = await db.collection("integrations").findOne({ key });
          assert.ok(row?.lastError, `${key} failed without recording why`);
          liveNotes.push(`${key}: unreachable → fallback checked (${row.lastError})`);
        }
      }
      const after = await db.collection("opportunities").countDocuments({ source: { $in: ["remotive", "arbeitnow"] }, status: "published" });
      if (!run.remotive?.ok && !run.arbeitnow?.ok) assert.equal(after, before, "a failed import changed the live listings");
      const again = await fetch(`${BASE}/api/cron/sync-jobs`, { headers: { Authorization: `Bearer ${CRON}` } }).then((r) => r.json());
      assert.equal(again.remotive.skipped, "interval", "Remotive called twice in a row");
    });

    // Real imports only (seeded sample listings use the same sources but have no lastSeenAt).
    const sampleExternal = await db.collection("opportunities").findOne({ source: { $in: ["remotive", "arbeitnow"] }, status: "published", lastSeenAt: { $ne: null }, isSample: { $ne: true } }, { sort: { postedAt: -1 } });
    await step("imported listings: plain-text, labelled with their source, apply on the source site only", async () => {
      if (!sampleExternal) throw new Error("no imported listing yet (both job boards unreachable since the database started)");
      assert.equal(sampleExternal.applyMethod, "external");
      assert.match(sampleExternal.applyUrl, sampleExternal.source === "remotive" ? /^https:\/\/remotive\.com\// : /^https:\/\/www\.arbeitnow\.[a-z]+\//); // Arbeitnow also uses country domains (.de, .fr…)
      assert.ok(!/<[a-z]|&lt;/i.test(sampleExternal.description), "HTML stored in the description");
      const label = sampleExternal.source === "remotive" ? "Remotive" : "Arbeitnow";
      assert.ok((await call(`/skillbridge?source=${sampleExternal.source}`)).data.includes(`via ${label}`), "source badge missing");
      const detail = await call(`/skillbridge/${sampleExternal._id}`);
      assert.ok(detail.data.includes(sampleExternal.applyUrl.replace(/&/g, "&amp;")) || detail.data.includes(sampleExternal.applyUrl), "link back to the source missing");
      const apply = await call(`/api/opportunities/${sampleExternal._id}/apply`, { method: "POST", cookie: aarav.cookie, form: applyForm("profile") });
      assert.equal(apply.res.status, 409);
    });

    await step("re-sync: take-downs stay down; vanished listings close only after a good fetch; returning ones reopen", async () => {
      const source = "arbeitnow";
      const now = new Date();
      const base = { companyName: "Smoke GmbH", description: "x", type: "full_time", workMode: "onsite", location: "Berlin", experienceLevel: "1-3", requiredSkills: ["Python"], source, applyMethod: "external", applyUrl: "https://www.arbeitnow.com/", postedAt: now, createdAt: now, updatedAt: now };
      const { insertedIds } = await db.collection("opportunities").insertMany([
        { ...base, title: "Smoke taken down", externalId: `smoke-down-${stamp}`, status: "published", lastSeenAt: now },
        { ...base, title: "Smoke vanished", externalId: `smoke-gone-${stamp}`, status: "published", lastSeenAt: new Date(now - 86_400_000) },
      ]);
      const [downId, ghostId] = Object.values(insertedIds);
      assert.equal((await adminPost(`/api/admin/listings/${downId}`, { action: "take_down", note: "Smoke: not a student role." })).data.status, "rejected");
      await db.collection("integrations").updateOne({ key: source }, { $set: { lastRunAt: new Date() } }, { upsert: true });
      assert.equal((await call(`/api/admin/integrations/${source}/sync`, { method: "POST", cookie: admin.cookie, json: {} })).res.status, 429, "sync allowed inside the interval");
      assert.equal((await call(`/api/admin/integrations/${source}/sync`, { method: "POST", cookie: aarav.cookie, json: {} })).res.status, 403);
      await db.collection("integrations").updateOne({ key: source }, { $set: { lastRunAt: new Date(Date.now() - 3_600_000) } });
      const res = await call(`/api/admin/integrations/${source}/sync`, { method: "POST", cookie: admin.cookie, json: {} });
      assert.equal((await db.collection("opportunities").findOne({ _id: downId })).status, "rejected", "take-down undone by sync");
      const ghost = await db.collection("opportunities").findOne({ _id: ghostId });
      if (res.res.status === 200) {
        assert.equal(ghost.status, "closed", "vanished listing still open after a good fetch");
        liveNotes.push(`re-sync: Arbeitnow answered (${res.data.stats.fetched} jobs)`);
      } else {
        assert.equal(res.res.status, 502, JSON.stringify(res.data));
        assert.equal(ghost.status, "published", "a failed fetch closed listings");
        liveNotes.push(`re-sync: Arbeitnow unreachable → checked that nothing was closed (${res.data.error})`);
      }
      const page = await call("/admin/integrations", { cookie: admin.cookie });
      assert.ok(["Remotive", "Arbeitnow", "Himalayas", "Jobicy", "Adzuna", "Code runner"].every((name) => page.data.includes(name)), "integrations page");
      await db.collection("opportunities").deleteMany({ _id: { $in: [downId, ghostId] } });
    });

    await step("GitHub and Codeforces stats: fetched or fallen back, cached, hidden when private, unknown handles reported", async () => {
      const me = new ObjectId(aarav.id);
      const aaravProfile = await db.collection("profiles").findOne({ userId: me });
      const restore = { githubUsername: aaravProfile.githubUsername ?? null, codeforcesHandle: aaravProfile.codeforcesHandle ?? null, visibility: aaravProfile.visibility };
      try {
        await db.collection("profiles").updateOne({ userId: me }, { $set: { githubUsername: "torvalds", codeforcesHandle: "tourist", "visibility.github": true, "visibility.codingStats": true } });
        await db.collection("external_profiles").deleteMany({ userId: me });
        const page = await call(`/u/${aarav.id}`, { cookie: riya.cookie });
        assert.ok(page.data.includes("@torvalds"), "GitHub card missing");
        const gh = await db.collection("external_profiles").findOne({ userId: me, provider: "github" });
        const cf = await db.collection("external_profiles").findOne({ userId: me, provider: "codeforces" });
        if (gh.status === "ok") {
          assert.ok(gh.data.publicRepos > 0 && page.data.includes("Repositories"));
          liveNotes.push("GitHub: live stats loaded");
        } else {
          assert.equal(gh.status, "error", JSON.stringify(gh));
          assert.ok(page.data.includes("GitHub isn"), "GitHub outage not explained on the page");
          liveNotes.push(`GitHub: unreachable → fallback message shown (${gh.error})`);
        }
        if (cf.status === "ok") {
          assert.ok(cf.data.rating > 2000 && page.data.includes("Best rank"));
          liveNotes.push("Codeforces: live stats loaded");
        } else {
          assert.equal(cf.status, "error", JSON.stringify(cf));
          assert.ok(page.data.includes("Codeforces isn"), "Codeforces outage not explained on the page");
          liveNotes.push(`Codeforces: unreachable → fallback message shown (${cf.error})`);
        }

        // A recent attempt isn't repeated on the next view (cache / failure back-off).
        await call(`/u/${aarav.id}`, { cookie: riya.cookie });
        assert.equal(String((await db.collection("external_profiles").findOne({ _id: gh._id })).attemptedAt), String(gh.attemptedAt), "GitHub called again straight away");

        // Hidden GitHub: other viewers see neither the link nor the card.
        await db.collection("profiles").updateOne({ userId: me }, { $set: { "visibility.github": false } });
        assert.ok(!(await call(`/u/${aarav.id}`, { cookie: riya.cookie })).data.includes("@torvalds"), "hidden GitHub shown");
        await db.collection("profiles").updateOne({ userId: me }, { $set: { "visibility.github": true } });

        // A stored copy survives an outage: mark it stale and failing, it's still shown.
        await db.collection("external_profiles").updateOne({ _id: gh._id }, { $set: { status: "error", error: "GitHub took too long to respond.", attemptedAt: new Date(), fetchedAt: new Date(Date.now() - 86_400_000), data: { login: "torvalds", name: null, publicRepos: 7, followers: 1, following: 0, totalStars: 3, topLanguages: [], featured: [], lastPushAt: null } } });
        const stale = await call(`/u/${aarav.id}`, { cookie: riya.cookie });
        assert.ok(stale.data.includes("Repositories") && stale.data.includes("showing the last copy"), "last good copy not shown during an outage");

        // Manual refresh: signed-in owner only, then a cooldown.
        assert.equal((await call("/api/profile/external", { method: "POST" })).res.status, 401);
        await db.collection("external_profiles").updateMany({ userId: me }, { $set: { attemptedAt: new Date(Date.now() - 600_000) } });
        const r1 = await call("/api/profile/external", { method: "POST", cookie: aarav.cookie });
        assert.equal(r1.res.status, 200, JSON.stringify(r1.data));
        assert.ok(["ok", "error"].includes(r1.data.github.status));
        assert.equal((await call("/api/profile/external", { method: "POST", cookie: aarav.cookie })).res.status, 429);
      } finally {
        await db.collection("profiles").updateOne({ userId: me }, { $set: restore });
        await db.collection("external_profiles").deleteMany({ userId: me });
      }
    });
    if (liveNotes.length) console.log(`  live external services:\n    ${liveNotes.join("\n    ")}`);
  }

  // ── Phase 11: security and operations ──────────────────────────
  await step("security headers on pages and APIs; no framework fingerprint", async () => {
    for (const path of ["/", "/api/health"]) {
      const res = await fetch(BASE + path);
      const csp = res.headers.get("content-security-policy") ?? "";
      assert.ok(csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"), `${path}: CSP missing`);
      assert.equal(res.headers.get("x-frame-options"), "DENY", path);
      assert.equal(res.headers.get("x-content-type-options"), "nosniff", path);
      assert.ok(res.headers.get("referrer-policy"), path);
      assert.equal(res.headers.get("x-powered-by"), null, `${path}: X-Powered-By sent`);
    }
  });

  await step("cross-site API writes are refused before they reach the route", async () => {
    const evil = await fetch(`${BASE}/api/profile/basics`, { method: "PATCH", headers: { Origin: "https://evil.example", Cookie: aarav.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Hacked" }) });
    assert.equal(evil.status, 403);
    const opaque = await fetch(`${BASE}/api/reports`, { method: "POST", headers: { Origin: "null", Cookie: aarav.cookie, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(opaque.status, 403);
    const p = await db.collection("profiles").findOne({ userId: new ObjectId(aarav.id) });
    assert.notEqual(p.fullName, "Hacked");
    // Same-site and non-browser requests still reach the route (and its own auth checks).
    assert.equal((await call("/api/profile/basics", { method: "PATCH", json: { fullName: "x" } })).res.status, 401);
    assert.equal((await fetch(`${BASE}/api/profile/basics`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
    // Reads are never blocked by the origin check.
    assert.equal((await fetch(`${BASE}/api/health`, { headers: { Origin: "https://evil.example" } })).status, 200);
  });

  await step("health endpoint: database ping, flags only, never cached", async () => {
    const res = await fetch(`${BASE}/api/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.mode, "database");
    assert.equal(body.database.ok, true);
    assert.match(res.headers.get("cache-control") ?? "", /no-store/);
    assert.ok(!JSON.stringify(body).match(/mongodb|secret|key|token|password/i), "health leaks configuration");
  });

  await step("rate limits are stored in MongoDB (shared by every server instance)", async () => {
    const appLimits = await db.collection("rate_limits").countDocuments({ _id: { $regex: `:${aarav.id}:` } });
    assert.ok(appLimits > 0, "no app rate-limit counters in MongoDB");
    const ttl = (await db.collection("rate_limits").indexes()).find((i) => i.key.expiresAt === 1);
    assert.equal(ttl?.expireAfterSeconds, 0, "rate_limits has no TTL index");
    assert.ok((await db.collection("rateLimit").countDocuments({})) > 0, "Better Auth sign-in limits not stored in MongoDB");
  });

  await mongo.close();
} else {
  console.log("  (set MONGODB_URI to also run the contest, SkillBridge, assessment and recruiter checks)");
}

console.log(`\n${passed} checks passed${process.exitCode ? ", some failed" : ""}.`);
