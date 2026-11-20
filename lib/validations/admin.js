import { z } from "zod";
import { ASSESSMENT_CATEGORIES } from "@/data/assessments";
import { optText, text } from "./common";

/* ── Users ─────────────────────────────────────────────────────── */
// Admin is granted only by `npm run make-admin`, so the console switches between these two.
export const userRoleSchema = z
  .object({
    role: z.enum(["student", "recruiter"], { error: "Choose student or recruiter" }),
    companyName: optText(120, "Company name"),
  })
  .strict();

export const userSuspendSchema = z
  .object({
    suspended: z.boolean(),
    reason: optText(500, "Reason"),
  })
  .strict()
  .refine((d) => !d.suspended || d.reason, { message: "Say why the account is being suspended", path: ["reason"] });

/* ── Companies and listings ────────────────────────────────────── */
export const companyDecisionSchema = z
  .object({
    action: z.enum(["verify", "reject", "unverify"]),
    note: optText(1000, "Note"),
  })
  .strict();

export const listingDecisionSchema = z
  .object({
    action: z.enum(["approve", "reject", "take_down"]),
    note: optText(1000, "Note"),
  })
  .strict()
  .refine((d) => d.action === "approve" || d.note, { message: "Tell the recruiter what needs to change", path: ["note"] });

/* ── Problems ──────────────────────────────────────────────────── */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z.string().trim().toLowerCase().min(3, "Slug is too short").max(80).regex(SLUG, "Use lowercase letters, numbers and dashes");
const tags = (label) => z.array(z.string().trim().min(1).max(40)).max(12, `Up to 12 ${label}`).default([]);
const testCase = z
  .object({
    input: z.string().max(20_000, "Test input is too long"),
    output: z.string().max(20_000, "Expected output is too long"),
    explanation: z.string().max(1000).default(""),
  })
  .strict();

export const problemSchema = z
  .object({
    title: text(140, "Title"),
    slug,
    difficulty: z.enum(["easy", "medium", "hard"], { error: "Choose a difficulty" }),
    description: text(20_000, "Description"),
    inputFormat: text(2000, "Input format"),
    outputFormat: text(2000, "Output format"),
    constraints: optText(2000, "Constraints"),
    topics: tags("topics").refine((t) => t.length > 0, "Add at least one topic"),
    concepts: tags("concepts"),
    hints: z.array(z.string().trim().min(1).max(500)).max(5, "Up to 5 hints").default([]),
    samples: z.array(testCase).min(1, "Add at least one sample test").max(5, "Up to 5 sample tests"),
    hiddenTests: z.array(testCase).min(1, "Add at least one hidden test").max(30, "Up to 30 hidden tests"),
    timeComplexity: optText(60, "Time complexity"),
    spaceComplexity: optText(60, "Space complexity"),
    xpReward: z.number().int().min(0).max(200),
    isInterview: z.boolean().default(false),
    isPublished: z.boolean().default(false),
  })
  .strict();

/* ── Questions ─────────────────────────────────────────────────── */
export const questionSchema = z
  .object({
    category: z.enum(ASSESSMENT_CATEGORIES.map((c) => c.key), { error: "Choose a category" }),
    topic: text(80, "Topic"),
    difficulty: z.enum(["easy", "medium", "hard"], { error: "Choose a difficulty" }),
    prompt: text(2000, "Question"),
    options: z.array(z.string().trim().min(1, "Options can't be empty").max(500)).min(2, "Add at least 2 options").max(6, "Up to 6 options"),
    answer: z.number().int().min(0),
    explanation: optText(2000, "Explanation"),
    isActive: z.boolean().default(true),
  })
  .strict()
  .refine((q) => q.answer < q.options.length, { message: "Mark one of the options as correct", path: ["answer"] })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === q.options.length, { message: "Options must be different", path: ["options"] });

/* ── Contests ──────────────────────────────────────────────────── */
export const contestSchema = z
  .object({
    title: text(140, "Title"),
    slug,
    description: optText(4000, "Description"),
    startsAt: z.coerce.date({ error: "Pick a start time" }),
    endsAt: z.coerce.date({ error: "Pick an end time" }),
    penaltyMinutesPerWrong: z.number().int().min(0).max(60),
    problems: z
      .array(z.object({ problemId: z.string().regex(/^[a-f0-9]{24}$/, "Pick a problem"), points: z.number().int().min(1).max(5000) }).strict())
      .min(1, "Add at least one problem")
      .max(10, "Up to 10 problems"),
    isPublished: z.boolean().default(false),
  })
  .strict()
  .refine((c) => c.endsAt > c.startsAt, { message: "The contest must end after it starts", path: ["endsAt"] })
  .refine((c) => c.endsAt - c.startsAt <= 7 * 86_400_000, { message: "Contests can run for at most 7 days", path: ["endsAt"] })
  .refine((c) => new Set(c.problems.map((p) => p.problemId)).size === c.problems.length, { message: "Each problem can be added once", path: ["problems"] });

/* ── Reports ───────────────────────────────────────────────────── */
export const REPORT_REASONS = ["spam", "misleading", "inappropriate", "incorrect", "other"];

export const reportSchema = z
  .object({
    entityType: z.enum(["opportunity", "profile", "problem", "question"]),
    entityId: z.string().regex(/^[a-f0-9]{24}$/, "Unknown item"),
    reason: z.enum(REPORT_REASONS, { error: "Choose a reason" }),
    details: optText(2000, "Details"),
  })
  .strict()
  .refine((r) => r.reason !== "other" || r.details, { message: "Add a few words about the problem", path: ["details"] });

export const reportDecisionSchema = z
  .object({
    action: z.enum(["dismiss", "action"]),
    note: optText(1000, "Note"),
  })
  .strict();
