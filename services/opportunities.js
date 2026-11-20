import "server-only";
import { ObjectId } from "mongodb";
import { companies as demoCompanies } from "@/data/demo/companies";
import { opportunities as demoOpportunities } from "@/data/opportunities";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Application, Company, Opportunity, SavedOpportunity } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { logActivity } from "./activity";
import { scoreOpportunity } from "./recommendations";
import { SOURCE_LABEL } from "@/lib/utils/format";

export class OpportunityError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const PAGE_SIZE = 24;
const MIN_FOR_YOU = 30;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oid = (id) => new ObjectId(String(id));
const plain = (v) => JSON.parse(JSON.stringify(v));

export const SORTS = ["match", "latest", "deadline"];
export const TABS = ["all", "foryou", "saved", "applied"];

/** Normalises raw search params into a filter object (unknown values are dropped). */
export function parseFilters(params = {}) {
  const pick = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
  const list = (v) => pick(v).split(",").map((s) => s.trim()).filter(Boolean);
  return {
    q: pick(params.q).slice(0, 100),
    type: list(params.type),
    mode: list(params.mode),
    experience: pick(params.experience),
    location: pick(params.location).slice(0, 60),
    source: Object.hasOwn(SOURCE_LABEL, pick(params.source)) ? pick(params.source) : "",
    sort: SORTS.includes(pick(params.sort)) ? pick(params.sort) : "match",
    tab: TABS.includes(pick(params.tab)) ? pick(params.tab) : "all",
    page: Math.max(1, Math.min(50, Number(pick(params.page)) || 1)),
  };
}

function demoListings() {
  const now = Date.now();
  return demoOpportunities.map(({ postedDaysAgo, deadlineInDays, ...o }) => ({
    ...o,
    _id: o.id,
    postedAt: new Date(now - postedDaysAgo * 86_400_000),
    applicationDeadline: new Date(now + deadlineInDays * 86_400_000),
  }));
}

function shapeCard(o, { match, saved, application }) {
  return {
    id: String(o._id ?? o.id),
    title: o.title,
    companyName: o.companyName,
    companyId: o.companyId ? String(o.companyId) : null,
    type: o.type,
    workMode: o.workMode,
    location: o.location,
    experienceLevel: o.experienceLevel,
    salary: o.salary ?? null,
    requiredSkills: o.requiredSkills ?? [],
    preferredSkills: o.preferredSkills ?? [],
    source: o.source,
    applyMethod: o.applyMethod,
    applyUrl: o.applyUrl ?? null,
    postedAt: o.postedAt,
    deadline: o.applicationDeadline ?? null,
    match: match ? { score: match.score, eligible: match.eligible, matchedSkills: match.matchedSkills, missingSkills: match.missingSkills, reasons: match.reasons } : null,
    saved: Boolean(saved),
    application: application ? { id: String(application._id), status: application.status } : null,
  };
}

function matchesFilters(o, f) {
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [o.title, o.companyName, o.location, ...(o.requiredSkills ?? []), ...(o.preferredSkills ?? [])].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.type.length && !f.type.includes(o.type)) return false;
  if (f.mode.length && !f.mode.includes(o.workMode)) return false;
  if (f.experience && o.experienceLevel !== f.experience) return false;
  if (f.location && !String(o.location ?? "").toLowerCase().includes(f.location.toLowerCase())) return false;
  if (f.source && o.source !== f.source) return false;
  return true;
}

/**
 * The board. `student` is { id, profile } for a signed-in student (enables
 * match scores, saved/applied state and the For you / Saved / Applied tabs).
 */
export async function listOpportunities(filters, student = null) {
  const now = new Date();
  let all;
  let savedIds = new Set();
  let applications = new Map();

  if (!isDatabaseConfigured()) {
    all = demoListings();
  } else {
    await connectToDatabase();
    const mongoFilter = { status: "published" };
    if (filters.q) {
      const rx = new RegExp(escapeRegex(filters.q), "i");
      mongoFilter.$or = [{ title: rx }, { companyName: rx }, { location: rx }, { requiredSkills: rx }, { preferredSkills: rx }];
    }
    if (filters.type.length) mongoFilter.type = { $in: filters.type };
    if (filters.mode.length) mongoFilter.workMode = { $in: filters.mode };
    if (filters.experience) mongoFilter.experienceLevel = filters.experience;
    if (filters.location) mongoFilter.location = new RegExp(escapeRegex(filters.location), "i");
    if (filters.source) mongoFilter.source = filters.source;

    if (student) {
      const [saved, apps] = await Promise.all([
        SavedOpportunity.find({ userId: oid(student.id) }, { opportunityId: 1 }).lean(),
        Application.find({ studentId: oid(student.id) }, { opportunityId: 1, status: 1 }).lean(),
      ]);
      savedIds = new Set(saved.map((s) => String(s.opportunityId)));
      applications = new Map(apps.map((a) => [String(a.opportunityId), a]));
    }
    // Saved and Applied tabs also show listings that have since closed.
    if (filters.tab === "saved") mongoFilter._id = { $in: [...savedIds].map(oid) };
    else if (filters.tab === "applied") mongoFilter._id = { $in: [...applications.keys()].map(oid) };
    else mongoFilter.$and = [{ $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: now } }] }];
    if (filters.tab === "saved" || filters.tab === "applied") delete mongoFilter.status;

    all = await Opportunity.find(mongoFilter).sort({ postedAt: -1 }).limit(300).lean();
  }

  let rows = all.filter((o) => matchesFilters(o, filters)).map((o) => {
    const id = String(o._id);
    return { o, match: student ? scoreOpportunity(student.profile, o) : null, saved: savedIds.has(id), application: applications.get(id) };
  });

  const forYou = rows.filter((r) => r.match && r.match.eligible && r.match.overlap && r.match.score >= MIN_FOR_YOU);
  if (filters.tab === "foryou") rows = forYou;

  const byDeadline = (r) => (r.o.applicationDeadline ? new Date(r.o.applicationDeadline).getTime() : Infinity);
  if (filters.sort === "latest" || !student) rows.sort((a, b) => new Date(b.o.postedAt) - new Date(a.o.postedAt));
  if (filters.sort === "deadline") rows.sort((a, b) => byDeadline(a) - byDeadline(b));
  if (filters.sort === "match" && student) rows.sort((a, b) => b.match.score - a.match.score || new Date(b.o.postedAt) - new Date(a.o.postedAt));

  const total = rows.length;
  const page = rows.slice(0, filters.page * PAGE_SIZE);
  return plain({
    mode: isDatabaseConfigured() ? "database" : "demo",
    items: page.map((r) => shapeCard(r.o, r)),
    total,
    hasMore: page.length < total,
    counts: student ? { foryou: forYou.length, saved: savedIds.size, applied: applications.size } : null,
  });
}

/** Full listing for the detail page, with the student's match, saved state and application. */
export async function getOpportunity(id, student = null) {
  let o;
  let company = null;
  if (!isDatabaseConfigured()) {
    o = demoListings().find((x) => x.id === id);
    if (o) company = demoCompanies.find((c) => c.id === o.companyId) ?? null;
  } else {
    if (!ObjectId.isValid(id)) return null;
    await connectToDatabase();
    o = await Opportunity.findById(id).lean();
    if (o && o.status !== "published") {
      // Drafts and rejected listings are visible only to applicants who already applied.
      const applied = student && (await Application.exists({ opportunityId: o._id, studentId: oid(student.id) }));
      if (!applied && o.status !== "closed") return null;
    }
    if (o?.companyId) company = await Company.findById(o.companyId, { name: 1, slug: 1, description: 1, website: 1, industry: 1, size: 1, location: 1, isVerified: 1 }).lean();
  }
  if (!o) return null;

  let saved = false;
  let application = null;
  if (student && isDatabaseConfigured()) {
    [saved, application] = await Promise.all([
      SavedOpportunity.exists({ userId: oid(student.id), opportunityId: o._id }),
      Application.findOne({ opportunityId: o._id, studentId: oid(student.id) }).lean(),
    ]);
  }
  const now = new Date();
  const closed = o.status !== "published" || (o.applicationDeadline && new Date(o.applicationDeadline) < now);
  return plain({
    ...shapeCard(o, { match: student ? scoreOpportunity(student.profile, o) : null, saved, application }),
    description: o.description,
    companyDescription: company?.description ?? o.companyDescription ?? "",
    company: company ? { name: company.name, slug: company.slug, website: company.website, industry: company.industry, size: company.size, location: company.location, isVerified: company.isVerified } : null,
    eligibility: o.eligibility ?? "",
    graduationYears: o.graduationYears ?? [],
    closed: Boolean(closed),
    status: o.status,
    applicationDetail: application
      ? { id: String(application._id), status: application.status, appliedAt: application.appliedAt, history: application.history ?? [], interviewAt: application.interviewAt ?? null }
      : null,
  });
}

export async function setSaved(user, opportunityId, saved) {
  if (!ObjectId.isValid(opportunityId)) throw new OpportunityError("Opportunity not found.", 404);
  await connectToDatabase();
  const exists = await Opportunity.exists({ _id: oid(opportunityId) });
  if (!exists) throw new OpportunityError("Opportunity not found.", 404);
  if (saved) {
    await SavedOpportunity.updateOne(
      { userId: oid(user.id), opportunityId: oid(opportunityId) },
      { $setOnInsert: { userId: oid(user.id), opportunityId: oid(opportunityId) } },
      { upsert: true },
    );
    await logActivity(user.id, "opportunity.saved", { entityType: "opportunity", entityId: opportunityId });
  } else {
    await SavedOpportunity.deleteOne({ userId: oid(user.id), opportunityId: oid(opportunityId) });
  }
  return { saved };
}
