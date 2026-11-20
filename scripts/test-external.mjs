/**
 * Unit tests for the external API mappers (no network, no database).
 *   node scripts/test-external.mjs
 * Fixtures are synthetic but follow the real response shapes.
 */
import assert from "node:assert/strict";
import { extractSkills, htmlToText, mapAdzunaJob, mapArbeitnowJob, mapHimalayasJob, mapJobicyJob, mapRemotiveJob, parseSalary } from "../lib/api/jobs/map.js";
import { mapCodechefContests, mapCodeforcesContests, mapCodeforcesProblems, mapLeetcodeContests } from "../lib/api/contests/map.js";
import { codeforcesRankColor, mapCodeforces, mapGithub } from "../lib/api/profiles/map.js";

const CATALOGUE = ["Python", "Java", "C++", "C", "JavaScript", "TypeScript", "SQL", "Go", "React", "Next.js", "Node.js", "Django", "PostgreSQL", "MongoDB", "Git", "Docker", "AWS", "Machine Learning", "Communication", "System Design"];

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (error) {
    console.error(`  ✖ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

test("htmlToText strips markup and scripts, keeps structure, decodes entities", () => {
  const text = htmlToText(`<h2>About</h2><p>We build&nbsp;tools &amp; APIs.</p><script>alert(1)</script><ul><li>React</li><li>Node</li></ul><img src=x onerror=alert(2)>Done &#8211; thanks`);
  assert.ok(!/[<>]/.test(text), "markup left in text");
  assert.ok(!text.includes("alert"), "script content kept");
  assert.match(text, /We build tools & APIs\./);
  assert.match(text, /• React\n• Node/);
  assert.match(text, /Done – thanks/);
  assert.equal(htmlToText("x".repeat(50), 20).length, 20);
  // Entity-escaped HTML (as some boards send it) is unescaped, then stripped.
  const escaped = htmlToText("&lt;p&gt;&lt;strong&gt;Data Steward&lt;/strong&gt;&lt;/p&gt;&lt;p&gt;Comp&amp;amp;Ben &amp;lt;3&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.ok(!/<[a-z/]/i.test(escaped), `tags left: ${escaped}`);
  assert.match(escaped, /^Data Steward\nComp&Ben <3/);
  assert.ok(!escaped.includes("alert"), "escaped script content kept");
  assert.equal(htmlToText("Use a &lt; b and x &gt; y"), "Use a < b and x > y", "plain text with < and > mangled");
  assert.equal(htmlToText(null), "");
});

test("extractSkills: catalogue names, aliases, word boundaries, tag-only words", () => {
  const skills = extractSkills({ tags: ["reactjs", "golang", "ruby/rails"], title: "Full-stack engineer", text: "Our stack: Node.js, PostgreSQL and C++. You'll go far. Good communication. Experience with js is a plus." }, CATALOGUE);
  for (const s of ["React", "Go", "Node.js", "PostgreSQL", "C++"]) assert.ok(skills.includes(s), `missing ${s}: ${skills}`);
  assert.ok(!skills.includes("Communication"), "soft skill matched from free text");
  assert.ok(!skills.includes("C"), "C matched inside other words");
  assert.ok(!skills.includes("JavaScript"), "short alias 'js' trusted in free text");
  assert.deepEqual(extractSkills({ tags: ["Communication"], title: "", text: "" }, CATALOGUE), ["Communication"]);
  assert.ok(!extractSkills({ title: "Javanese translator", text: "" }, CATALOGUE).includes("Java"), "Java matched inside Javanese");
  assert.ok(extractSkills({ title: "", text: "Comfortable with SQL (MySQL or Postgres)" }, CATALOGUE).includes("SQL"));
});

test("parseSalary: ranges, k suffix, currencies, periods, junk", () => {
  assert.deepEqual(parseSalary("$170k - $200k"), { min: 170_000, max: 200_000, currency: "USD", period: "year" });
  assert.deepEqual(parseSalary("€60,000–75,000 per year"), { min: 60_000, max: 75_000, currency: "EUR", period: "year" });
  assert.deepEqual(parseSalary("USD 40-55 per hour"), { min: 40, max: 55, currency: "USD", period: "hour" });
  assert.deepEqual(parseSalary("$5000/month"), { min: 5000, max: 5000, currency: "USD", period: "month" });
  assert.equal(parseSalary("Competitive"), null);
  assert.equal(parseSalary("$50"), null, "tiny yearly salary accepted");
  assert.equal(parseSalary(""), null);
});

test("mapRemotiveJob: external, remote, linked back, skills and level", () => {
  const job = {
    id: 42,
    url: "https://remotive.com/remote-jobs/software-dev/junior-react-developer-42",
    title: "Junior React Developer",
    company_name: "Acme Remote",
    tags: ["react", "typescript", "AWS"],
    job_type: "full_time",
    publication_date: "2026-11-14T20:33:53",
    candidate_required_location: "Worldwide",
    salary: "$40k - $55k",
    description: "<p>Build UIs with <b>React</b> and Node.js.</p>",
  };
  const o = mapRemotiveJob(job, CATALOGUE);
  assert.equal(o.source, "remotive");
  assert.equal(o.externalId, "42");
  assert.equal(o.applyMethod, "external");
  assert.equal(o.applyUrl, job.url);
  assert.equal(o.workMode, "remote");
  assert.equal(o.experienceLevel, "fresher");
  assert.equal(o.type, "full_time");
  assert.equal(o.postedAt.toISOString(), "2026-11-14T20:33:53.000Z");
  assert.deepEqual(o.salary, { min: 40_000, max: 55_000, currency: "USD", period: "year" });
  for (const s of ["React", "TypeScript", "AWS", "Node.js"]) assert.ok(o.requiredSkills.includes(s), `missing ${s}`);
  assert.equal(o.description, "Build UIs with React and Node.js.");
  assert.equal(mapRemotiveJob({ ...job, job_type: "contract" }, CATALOGUE).type, "freelance");
  assert.equal(mapRemotiveJob({ ...job, title: "Senior Platform Engineer" }, CATALOGUE).experienceLevel, "3+");
  assert.equal(mapRemotiveJob({ ...job, url: undefined }, CATALOGUE), null, "listing without a link back kept");
  assert.equal(mapRemotiveJob({ ...job, url: "javascript:alert(1)" }, CATALOGUE), null, "javascript: link kept");
  assert.equal(mapArbeitnowJob({ slug: "x", company_name: "X", title: "Python developer", url: "data:text/html,hi", tags: ["Python", "Django"], job_types: [] }, CATALOGUE), null, "data: link kept");
});

test("mapArbeitnowJob: keeps tech roles only, maps German job types", () => {
  const base = { slug: "werkstudent-software-12", company_name: "Beispiel GmbH", url: "https://www.arbeitnow.com/jobs/companies/beispiel/werkstudent-software-12", remote: false, location: "Berlin", created_at: 1795118436 };
  const tech = mapArbeitnowJob({ ...base, title: "Werkstudent Softwareentwicklung (Python)", tags: ["Python", "Django"], job_types: ["Werkstudent", "working student"], description: "<p>Python, Django, Docker.</p>" }, CATALOGUE);
  assert.equal(tech.source, "arbeitnow");
  assert.equal(tech.type, "part_time");
  assert.equal(tech.experienceLevel, "fresher");
  assert.equal(tech.workMode, "onsite");
  assert.equal(tech.location, "Berlin");
  assert.equal(tech.postedAt.getTime(), 1795118436 * 1000);
  assert.ok(tech.requiredSkills.includes("Python") && tech.requiredSkills.includes("Django"));
  const intern = mapArbeitnowJob({ ...base, title: "Praktikum Data Engineering", tags: [], job_types: ["internship"], description: "SQL and Python" }, CATALOGUE);
  assert.equal(intern.type, "internship");
  const senior = mapArbeitnowJob({ ...base, title: "Senior Backend Engineer", tags: ["Go", "PostgreSQL"], job_types: ["Full Time", "berufserfahren"], remote: true, description: "" }, CATALOGUE);
  assert.equal(senior.experienceLevel, "3+");
  assert.equal(senior.workMode, "remote");
  const nonTech = mapArbeitnowJob({ ...base, title: "Werkstudent:in Content Creation & Videoschnitt", tags: ["Social Media Manager"], job_types: ["Werkstudent"], description: "<p>Instagram und TikTok.</p>" }, CATALOGUE);
  assert.equal(nonTech, null, "non-tech job kept");
});

test("mapHimalayasJob: tech roles only, remote, seniority and salary", () => {
  const base = { guid: "https://himalayas.app/companies/acme/jobs/react-intern", applicationLink: "https://himalayas.app/companies/acme/jobs/react-intern?utm_source=api", companyName: "Acme", employmentType: "Intern", seniority: ["Entry-level"], locationRestrictions: ["India", "Singapore"], categories: ["Frontend-Developer"], pubDate: 1795129346, expiryDate: 1800313346 };
  const o = mapHimalayasJob({ ...base, title: "Frontend Developer Intern", description: "<p>React, TypeScript and Git.</p>", minSalary: 30000, maxSalary: 40000, currency: "USD", salaryPeriod: "annual" }, CATALOGUE);
  assert.equal(o.source, "himalayas");
  assert.equal(o.type, "internship");
  assert.equal(o.experienceLevel, "fresher");
  assert.equal(o.workMode, "remote");
  assert.match(o.location, /India, Singapore/);
  assert.deepEqual(o.salary, { min: 30000, max: 40000, currency: "USD", period: "year" });
  assert.ok(o.requiredSkills.includes("React") && o.requiredSkills.includes("TypeScript"));
  assert.equal(o.applicationDeadline.getTime(), 1800313346 * 1000);
  assert.equal(mapHimalayasJob({ ...base, title: "Customer Success Manager", description: "Talk to customers." }, CATALOGUE), null, "non-tech role kept");
  assert.equal(mapHimalayasJob({ ...base, title: "Senior Backend Engineer", seniority: ["Senior"], employmentType: "Full Time", description: "Go and PostgreSQL" }, CATALOGUE).experienceLevel, "3+");
});

test("mapJobicyJob: credit link kept as the apply URL, levels and types", () => {
  const job = { id: 163370, url: "https://jobicy.com/jobs/163370-backend-engineer", jobTitle: "Junior Backend Engineer", companyName: "Wellhub", jobIndustry: ["Software Engineering"], jobType: ["Full-Time"], jobGeo: "Brazil", jobLevel: "Entry", jobDescription: "<p>Node.js and MongoDB.</p>", pubDate: "2026-11-19T15:41:01+00:00" };
  const o = mapJobicyJob(job, CATALOGUE);
  assert.equal(o.source, "jobicy");
  assert.equal(o.applyUrl, job.url);
  assert.equal(o.experienceLevel, "fresher");
  assert.equal(o.type, "full_time");
  assert.equal(o.location, "Remote · Brazil");
  assert.ok(o.requiredSkills.includes("Node.js") && o.requiredSkills.includes("MongoDB"));
  assert.equal(mapJobicyJob({ ...job, jobType: ["Contract"] }, CATALOGUE).type, "freelance");
  assert.equal(mapJobicyJob({ ...job, url: "javascript:alert(1)" }, CATALOGUE), null);
});

test("mapAdzunaJob: India internships, work mode, real salaries only", () => {
  const job = { id: "4890123", title: "Software Developer <strong>Intern</strong>", description: "Work from home. Python and Django, SQL.", redirect_url: "https://www.adzuna.in/land/ad/4890123", company: { display_name: "Infosys" }, location: { display_name: "Bengaluru, Karnataka" }, created: "2026-11-18T10:00:00Z", contract_time: "full_time", salary_min: 180000, salary_max: 240000, salary_is_predicted: "0" };
  const o = mapAdzunaJob(job, CATALOGUE);
  assert.equal(o.source, "adzuna");
  assert.equal(o.title, "Software Developer Intern", "markup left in title");
  assert.equal(o.type, "internship");
  assert.equal(o.workMode, "remote");
  assert.equal(o.location, "Bengaluru, Karnataka");
  assert.deepEqual(o.salary, { min: 180000, max: 240000, currency: "INR", period: "year" });
  assert.equal(mapAdzunaJob({ ...job, salary_is_predicted: "1" }, CATALOGUE).salary, null, "estimated pay shown as real");
  assert.equal(mapAdzunaJob({ ...job, title: "Senior Data Engineer", description: "Hybrid role. Python, SQL." }, CATALOGUE).workMode, "hybrid");
});

test("mapGithub: skips forks, ranks languages, features starred repos", () => {
  const user = { login: "octo", name: "Octo Cat", public_repos: 5, followers: 12, following: 3, created_at: "2020-01-01T00:00:00Z" };
  const repos = [
    { name: "app", fork: false, language: "JavaScript", stargazers_count: 10, forks_count: 2, html_url: "https://github.com/octo/app", pushed_at: "2026-11-01T00:00:00Z", description: "An app" },
    { name: "lib", fork: false, language: "JavaScript", stargazers_count: 3, forks_count: 0, html_url: "https://github.com/octo/lib", pushed_at: "2026-10-01T00:00:00Z" },
    { name: "ml", fork: false, language: "Python", stargazers_count: 25, forks_count: 4, html_url: "https://github.com/octo/ml", pushed_at: "2026-09-01T00:00:00Z" },
    { name: "fork", fork: true, language: "Rust", stargazers_count: 999, forks_count: 0, html_url: "https://github.com/octo/fork" },
    { name: "evil", fork: false, language: null, stargazers_count: 0, forks_count: 0, html_url: "javascript:alert(1)" },
  ];
  const g = mapGithub(user, repos);
  assert.equal(g.totalStars, 38, "forks counted in stars");
  assert.deepEqual(g.topLanguages, [{ name: "JavaScript", repos: 2 }, { name: "Python", repos: 1 }]);
  assert.deepEqual(g.featured.map((r) => r.name), ["ml", "app", "lib", "evil"]);
  assert.equal(g.featured.find((r) => r.name === "evil").url, null, "unsafe link kept");
  assert.equal(g.lastPushAt, "2026-11-01T00:00:00Z");
});

test("mapCodeforces: rating, best rank, last 20 contests", () => {
  const history = Array.from({ length: 25 }, (_, i) => ({ contestId: i + 1, contestName: `Round ${i + 1}`, rank: 500 - i * 10, oldRating: 1200 + i * 10, newRating: 1210 + i * 10, ratingUpdateTimeSeconds: 1_700_000_000 + i * 86_400 }));
  const c = mapCodeforces({ handle: "Coder", rating: 1450, maxRating: 1460, rank: "specialist", maxRank: "specialist" }, history);
  assert.equal(c.contestCount, 25);
  assert.equal(c.bestRank, 260);
  assert.equal(c.recent.length, 20);
  assert.equal(c.recent.at(-1).newRating, 1450);
  assert.equal(mapCodeforces({ handle: "new" }, []).rank, "unrated");
  assert.equal(codeforcesRankColor("expert"), "#0000FF");
  assert.equal(codeforcesRankColor("international grandmaster"), "#FF0000");
});

test("contest calendars: upcoming only, safe links, times and durations", () => {
  const now = Date.UTC(2026, 10, 20);
  const sec = (d) => Math.floor(d / 1000);
  const cf = mapCodeforcesContests([
    { id: 2100, name: "Codeforces Round 1136 (Div. 2)", phase: "BEFORE", startTimeSeconds: sec(now + 86_400_000), durationSeconds: 7200 },
    { id: 2099, name: "Old round", phase: "FINISHED", startTimeSeconds: sec(now - 86_400_000), durationSeconds: 7200 },
    { id: 2098, name: "Gym", phase: "BEFORE" },
  ], now);
  assert.deepEqual(cf, [{ platform: "codeforces", id: "cf-2100", title: "Codeforces Round 1136 (Div. 2)", startsAt: "2026-11-21T00:00:00.000Z", durationMinutes: 120, url: "https://codeforces.com/contests/2100" }]);

  const lc = mapLeetcodeContests([
    { title: "Weekly Contest 529", titleSlug: "weekly-contest-529", startTime: sec(now + 2 * 86_400_000), duration: 5400 },
    { title: "Evil", titleSlug: "../../evil", startTime: sec(now + 86_400_000), duration: 5400 },
    { title: "Past", titleSlug: "weekly-contest-528", startTime: sec(now - 1000), duration: 5400 },
  ], now);
  assert.equal(lc.length, 1, "past or unsafe slugs kept");
  assert.equal(lc[0].url, "https://leetcode.com/contest/weekly-contest-529");
  assert.equal(lc[0].durationMinutes, 90);

  const cc = mapCodechefContests([
    { contest_code: "START266", contest_name: "Starters 266", contest_start_date_iso: "2026-11-25T20:00:00+05:30", contest_duration: "120" },
    { contest_code: "bad/code", contest_name: "x", contest_start_date_iso: "2026-11-25T20:00:00+05:30", contest_duration: "120" },
    { contest_code: "NODATE", contest_name: "y", contest_start_date_iso: "not a date" },
  ], now);
  assert.deepEqual(cc.map((c) => [c.id, c.startsAt, c.durationMinutes, c.url]), [["cc-START266", "2026-11-25T14:30:00.000Z", 120, "https://www.codechef.com/START266"]]);
});

test("mapCodeforcesProblems: programming problems only, solve counts, no *special tag", () => {
  const out = mapCodeforcesProblems({
    problems: [
      { contestId: 1985, index: "A", name: "Creating Words", type: "PROGRAMMING", rating: 800, tags: ["implementation", "strings"] },
      { contestId: 1985, index: "B1", name: "Easy version", type: "PROGRAMMING", tags: ["*special", "math"] },
      { contestId: 1985, index: "Z", name: "Quiz", type: "QUESTION", rating: 800, tags: [] },
      { index: "A", name: "No contest", type: "PROGRAMMING", tags: [] },
    ],
    problemStatistics: [{ contestId: 1985, index: "A", solvedCount: 94000 }],
  });
  assert.deepEqual(out.map((p) => p.key), ["1985A", "1985B1"]);
  assert.deepEqual(out[0], { key: "1985A", contestId: 1985, index: "A", name: "Creating Words", rating: 800, tags: ["implementation", "strings"], solvedCount: 94000, url: "https://codeforces.com/problemset/problem/1985/A" });
  assert.equal(out[1].rating, null, "missing rating kept as a number");
  assert.deepEqual(out[1].tags, ["math"]);
  assert.equal(out[1].solvedCount, 0);
  assert.deepEqual(mapCodeforcesProblems(null), []);
});

console.log(`\n${passed} external API tests passed${process.exitCode ? ", some failed" : ""}.`);
