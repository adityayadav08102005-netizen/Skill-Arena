/**
 * Pure mapping from external job boards (Remotive, Arbeitnow) to SkillArena
 * opportunities. No server-only or path-alias imports, so the unit tests in
 * scripts/test-external.mjs can run it with plain Node.
 */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bull: "•", euro: "€", pound: "£" };

/**
 * HTML job description → plain text. The result is shown as text (never as
 * HTML), so nothing from the source page can run in the browser.
 */
const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);

export function htmlToText(html, max = 10_000) {
  if (!html) return "";
  let source = String(html);
  // Some boards send the HTML itself entity-escaped (&lt;p&gt;…): unescape it once first.
  if (/&lt;\/?[a-z][^&]*&gt;/i.test(source)) source = decodeEntities(source);
  const text = source
    .replace(/<(script|style|iframe|noscript)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    // A tag that only appears after decoding (double-escaped source) is dropped as well.
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Extra spellings that mean a catalogue skill. Keys are lower case. */
export const SKILL_ALIASES = {
  js: "JavaScript",
  javascript: "JavaScript",
  es6: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  golang: "Go",
  "node": "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  reactjs: "React",
  "react.js": "React",
  "react native": "React",
  nextjs: "Next.js",
  "next.js": "Next.js",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  "spring boot": "Spring Boot",
  spring: "Spring Boot",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  "ai/ml": "Machine Learning",
  "data analysis": "Data Analysis",
  "data analytics": "Data Analysis",
  "amazon web services": "AWS",
  "c/c++": "C++",
  cpp: "C++",
  "system design": "System Design",
  "system architecture": "System Design",
  mysql: "SQL",
  sql: "SQL",
};

// Catalogue names that are also everyday words; only trust them as tags, never in free text.
const TAG_ONLY = new Set(["go", "c", "communication", "teamwork", "leadership", "problem solving", "git", "node", "spring", "ts", "ml", "js"]);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Skills found in a job's tags, title and description, limited to the
 * catalogue (plus aliases). Tags count fully; free text only for names that
 * aren't ordinary words. Returns catalogue spellings, most specific first.
 */
export function extractSkills({ tags = [], title = "", text = "" }, catalogue) {
  const byLower = new Map(catalogue.map((name) => [name.toLowerCase(), name]));
  const found = new Set();
  const canonical = (raw) => byLower.get(raw) ?? (SKILL_ALIASES[raw] && byLower.get(SKILL_ALIASES[raw].toLowerCase()));

  for (const tag of tags) {
    const raw = String(tag).trim().toLowerCase();
    const hit = canonical(raw) ?? raw.split(/[/,]/).map((p) => canonical(p.trim())).find(Boolean);
    if (hit) found.add(hit);
  }

  const haystack = ` ${title} ${text.slice(0, 6000)} `.toLowerCase();
  const terms = [...byLower.keys(), ...Object.keys(SKILL_ALIASES)].filter((t) => !TAG_ONLY.has(t) && t.length > 1);
  for (const term of terms) {
    // Word boundaries that also work for names like C++ and Node.js.
    if (new RegExp(`(^|[^a-z0-9+#.])${escape(term)}(?=$|[^a-z0-9+#])`, "i").test(haystack)) {
      const hit = canonical(term);
      if (hit) found.add(hit);
    }
  }
  return [...found].slice(0, 12);
}

/** "$170k - $200k", "€60,000–75,000 per year", "USD 40/hr" → { min, max, currency, period } or null. */
export function parseSalary(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.toLowerCase().replace(/,/g, "");
  const currency = /€|eur/.test(s) ? "EUR" : /\$|usd/.test(s) ? "USD" : /₹|inr/.test(s) ? "INR" : null;
  if (!currency) return null;
  const nums = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/g)].map((m) => Number(m[1]) * (m[2] ? 1000 : 1)).filter((n) => n > 0);
  if (!nums.length) return null;
  const period = /hour|\/h|hr\b/.test(s) ? "hour" : /month|\/mo\b|monthly/.test(s) ? "month" : "year";
  const min = Math.min(nums[0], nums[1] ?? nums[0]);
  const max = Math.max(nums[0], nums[1] ?? nums[0]);
  if (period === "year" && max < 1000) return null; // "$50" a year is a parsing accident
  return { min, max, currency, period };
}

const has = (list, re) => list.some((x) => re.test(x));

/** Only plain http(s) links reach an href; anything else (javascript:, data:, …) drops the listing. */
export function safeUrl(raw) {
  try {
    const u = new URL(String(raw));
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Arbeitnow mixes English and German job-type labels. */
function arbeitnowType(types) {
  if (has(types, /intern|praktikum/i)) return "internship";
  if (has(types, /werkstudent|working student|student/i)) return "part_time";
  if (has(types, /part.?time|teilzeit|minijob/i)) return "part_time";
  if (has(types, /freelance|freiberuf/i)) return "freelance";
  return "full_time";
}

function arbeitnowLevel(types, title) {
  const all = [...types, title];
  if (has(all, /intern|praktik|werkstudent|working student|student|berufseinstieg|no experience|junior|entry|graduate|trainee|azubi|ausbildung/i)) return "fresher";
  if (has(all, /senior|lead|leitung|principal|head of|staff|teamleitung|geschäftsleitung/i)) return "3+";
  return "1-3";
}

const REMOTIVE_TYPE = { full_time: "full_time", part_time: "part_time", contract: "freelance", freelance: "freelance", internship: "internship" };

function remotiveLevel(title) {
  if (/intern|junior|entry|graduate|trainee/i.test(title)) return "fresher";
  if (/senior|lead|principal|staff|head of|director|manager/i.test(title)) return "3+";
  return "1-3";
}

const TECH_TITLE = /develop|engineer|software|programm|data|devops|frontend|front-end|backend|back-end|full.?stack|web|cloud|security|qa\b|test|machine learning|\bml\b|\bai\b|analyst|it[- ]|informatik|sre|platform|mobile|ios|android/i;

/**
 * Remotive job → opportunity fields. Returns null for listings to skip.
 * `catalogue` is the list of skill names.
 */
export function mapRemotiveJob(job, catalogue) {
  const applyUrl = safeUrl(job?.url);
  if (!job?.id || !applyUrl || !job.title || !job.company_name) return null;
  const text = htmlToText(job.description);
  const skills = extractSkills({ tags: job.tags ?? [], title: job.title, text }, catalogue);
  const type = REMOTIVE_TYPE[job.job_type] ?? "full_time";
  const postedAt = job.publication_date ? new Date(`${job.publication_date.replace(/Z?$/, "")}Z`) : new Date();
  return {
    source: "remotive",
    externalId: String(job.id),
    title: String(job.title).slice(0, 160),
    companyName: String(job.company_name).slice(0, 120),
    description: text || "See the full description on Remotive.",
    type,
    workMode: "remote",
    location: (job.candidate_required_location || "Remote").slice(0, 120),
    experienceLevel: type === "internship" ? "fresher" : remotiveLevel(job.title),
    requiredSkills: skills.slice(0, 8),
    preferredSkills: skills.slice(8),
    eligibility: job.candidate_required_location ? `Candidates in: ${job.candidate_required_location}`.slice(0, 2000) : "",
    salary: parseSalary(job.salary),
    applyMethod: "external",
    applyUrl,
    postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
  };
}

/**
 * Arbeitnow job → opportunity fields, or null. Arbeitnow lists every kind of
 * job (mostly in Germany), so only tech roles with recognisable skills are kept.
 */
export function mapArbeitnowJob(job, catalogue) {
  const applyUrl = safeUrl(job?.url);
  if (!job?.slug || !applyUrl || !job.title || !job.company_name) return null;
  const text = htmlToText(job.description);
  const skills = extractSkills({ tags: job.tags ?? [], title: job.title, text }, catalogue);
  const tech = skills.length >= 2 || (skills.length === 1 && TECH_TITLE.test(job.title));
  if (!tech) return null;
  const types = job.job_types ?? [];
  const postedAt = job.created_at ? new Date(job.created_at * 1000) : new Date();
  return {
    source: "arbeitnow",
    externalId: String(job.slug),
    title: String(job.title).slice(0, 160),
    companyName: String(job.company_name).slice(0, 120),
    description: text || "See the full description on Arbeitnow.",
    type: arbeitnowType(types),
    workMode: job.remote ? "remote" : "onsite",
    location: (job.location || (job.remote ? "Remote" : "Germany")).slice(0, 120),
    experienceLevel: arbeitnowLevel(types, job.title),
    requiredSkills: skills.slice(0, 8),
    preferredSkills: skills.slice(8),
    eligibility: "",
    salary: null,
    applyMethod: "external",
    applyUrl,
    postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
  };
}

/* ── Himalayas (remote jobs; https://himalayas.app/api) ───────────── */
function levelFrom(labels, title) {
  const all = [...labels, title].join(" ");
  if (/intern|entry|junior|graduate|trainee|fresher/i.test(all)) return "fresher";
  if (/senior|lead|principal|staff|head of|director|manager|executive/i.test(all)) return "3+";
  return "1-3";
}

function typeFrom(labels, title) {
  const all = [...labels, title].join(" ");
  if (/intern/i.test(all)) return "internship";
  if (/part.?time/i.test(all)) return "part_time";
  if (/contract|freelance|temporary/i.test(all)) return "freelance";
  return "full_time";
}

/** Himalayas job → opportunity fields, or null. Only tech roles with recognisable skills are kept. */
export function mapHimalayasJob(job, catalogue) {
  const applyUrl = safeUrl(job?.applicationLink || job?.guid);
  const id = job?.guid || job?.applicationLink;
  if (!id || !applyUrl || !job.title || !job.companyName) return null;
  const text = htmlToText(job.description);
  const skills = extractSkills({ tags: job.categories ?? [], title: job.title, text }, catalogue);
  if (!(skills.length >= 2 || (skills.length === 1 && TECH_TITLE.test(job.title)))) return null;
  const labels = [...(job.seniority ?? []), job.employmentType ?? ""];
  const where = (job.locationRestrictions ?? []).filter(Boolean);
  const min = Number(job.minSalary) || null;
  const max = Number(job.maxSalary) || null;
  const currency = typeof job.currency === "string" && /^[A-Z]{3}$/.test(job.currency) ? job.currency : null;
  const postedAt = job.pubDate ? new Date(job.pubDate * 1000) : new Date();
  return {
    source: "himalayas",
    externalId: String(id).slice(0, 300),
    title: String(job.title).slice(0, 160),
    companyName: String(job.companyName).slice(0, 120),
    description: text || "See the full description on Himalayas.",
    type: typeFrom(labels, job.title),
    workMode: "remote",
    location: where.length ? `Remote · ${where.slice(0, 3).join(", ")}`.slice(0, 120) : "Remote (worldwide)",
    experienceLevel: levelFrom(labels, job.title),
    requiredSkills: skills.slice(0, 8),
    preferredSkills: skills.slice(8),
    eligibility: where.length ? `Open to candidates in: ${where.join(", ")}`.slice(0, 2000) : "",
    salary: min && currency ? { min, max: max ?? min, currency, period: job.salaryPeriod === "hourly" ? "hour" : job.salaryPeriod === "monthly" ? "month" : "year" } : null,
    applyMethod: "external",
    applyUrl,
    postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
    applicationDeadline: job.expiryDate ? new Date(job.expiryDate * 1000) : null,
  };
}

/* ── Jobicy (remote jobs; https://jobicy.com/jobs-rss-feed) ───────── */
/** Jobicy job → opportunity fields, or null. Their terms: credit Jobicy and link applications to the original URL. */
export function mapJobicyJob(job, catalogue) {
  const applyUrl = safeUrl(job?.url);
  if (!job?.id || !applyUrl || !job.jobTitle || !job.companyName) return null;
  const text = htmlToText(job.jobDescription);
  const skills = extractSkills({ tags: job.jobIndustry ?? [], title: job.jobTitle, text }, catalogue);
  if (!skills.length) return null;
  const labels = [...(job.jobType ?? []), job.jobLevel ?? ""];
  const min = Number(job.annualSalaryMin) || null;
  const max = Number(job.annualSalaryMax) || null;
  const currency = typeof job.salaryCurrency === "string" && /^[A-Z]{3}$/.test(job.salaryCurrency) ? job.salaryCurrency : null;
  const postedAt = job.pubDate ? new Date(job.pubDate) : new Date();
  return {
    source: "jobicy",
    externalId: String(job.id),
    title: String(job.jobTitle).slice(0, 160),
    companyName: String(job.companyName).slice(0, 120),
    description: text || "See the full description on Jobicy.",
    type: typeFrom(labels, job.jobTitle),
    workMode: "remote",
    location: job.jobGeo ? `Remote · ${job.jobGeo}`.slice(0, 120) : "Remote",
    experienceLevel: levelFrom(labels, job.jobTitle),
    requiredSkills: skills.slice(0, 8),
    preferredSkills: skills.slice(8),
    eligibility: job.jobGeo ? `Candidates in: ${job.jobGeo}`.slice(0, 2000) : "",
    salary: min && currency ? { min, max: max ?? min, currency, period: "year" } : null,
    applyMethod: "external",
    applyUrl,
    postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
  };
}

/* ── Adzuna (India; https://developer.adzuna.com) ─────────────────── */
/** Adzuna India result → opportunity fields, or null. Salaries are yearly in INR. */
export function mapAdzunaJob(job, catalogue) {
  const applyUrl = safeUrl(job?.redirect_url);
  const company = job?.company?.display_name;
  if (!job?.id || !applyUrl || !job.title || !company) return null;
  const title = htmlToText(job.title, 160);
  const text = htmlToText(job.description);
  const skills = extractSkills({ tags: [], title, text }, catalogue);
  if (!(skills.length || TECH_TITLE.test(title))) return null;
  const all = `${title} ${text}`;
  const labels = [job.contract_time ?? "", job.contract_type ?? ""];
  const min = Number(job.salary_min) || null;
  const max = Number(job.salary_max) || null;
  const postedAt = job.created ? new Date(job.created) : new Date();
  return {
    source: "adzuna",
    externalId: String(job.id),
    title,
    companyName: String(company).slice(0, 120),
    description: text || "See the full description on Adzuna.",
    type: /intern/i.test(title) ? "internship" : job.contract_time === "part_time" ? "part_time" : job.contract_type === "contract" ? "freelance" : typeFrom(labels, title),
    workMode: /\bremote\b|work from home|wfh/i.test(all) ? "remote" : /\bhybrid\b/i.test(all) ? "hybrid" : "onsite",
    location: (job.location?.display_name || "India").slice(0, 120),
    experienceLevel: levelFrom([], title),
    requiredSkills: skills.slice(0, 8),
    preferredSkills: skills.slice(8),
    eligibility: "",
    // Adzuna marks estimated pay with salary_is_predicted = "1"; only show real figures.
    salary: min && String(job.salary_is_predicted) !== "1" ? { min, max: max ?? min, currency: "INR", period: "year" } : null,
    applyMethod: "external",
    applyUrl,
    postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
  };
}
