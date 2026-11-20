import { z } from "zod";
import { optText, optUrl, text } from "./common";

export const companySchema = z
  .object({
    name: text(120, "Company name"),
    description: optText(3000, "Description"),
    website: optUrl("Website"),
    industry: optText(80, "Industry"),
    size: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"], { error: "Choose a company size" }),
    location: optText(120, "Location"),
  })
  .strict();

const skillList = z.array(z.string().trim().min(1).max(60)).max(20, "Up to 20 skills");
const amount = z.preprocess((v) => (v === "" || v === null ? undefined : typeof v === "string" ? Number(v) : v), z.number().min(0).max(100_000_000).optional());

export const opportunitySchema = z
  .object({
    title: text(160, "Title"),
    description: text(10000, "Description"),
    type: z.enum(["internship", "full_time", "part_time", "freelance", "student_project", "training"], { error: "Choose a type" }),
    workMode: z.enum(["remote", "hybrid", "onsite"], { error: "Choose a work mode" }),
    location: text(120, "Location"),
    experienceLevel: z.enum(["fresher", "0-1", "1-3", "3+"], { error: "Choose an experience level" }),
    requiredSkills: skillList.min(1, "Add at least one required skill"),
    preferredSkills: skillList.default([]),
    eligibility: optText(2000, "Eligibility"),
    graduationYears: z.array(z.number().int().min(2000).max(2100)).max(8).default([]),
    salaryMin: amount,
    salaryMax: amount,
    salaryPeriod: z.enum(["hour", "month", "year", "total"]).default("month"),
    applicationDeadline: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.date().optional()),
    status: z.enum(["draft", "published"]).default("published"),
  })
  .strict()
  .refine((o) => o.salaryMin === undefined || o.salaryMax === undefined || o.salaryMax >= o.salaryMin, { message: "Maximum pay can't be below the minimum", path: ["salaryMax"] })
  .refine((o) => !o.applicationDeadline || o.applicationDeadline > new Date(), { message: "The deadline must be in the future", path: ["applicationDeadline"] });

/** Recruiter-settable statuses; "applied" and "withdrawn" belong to the student. */
export const RECRUITER_STATUSES = ["under_review", "shortlisted", "interview_scheduled", "selected", "rejected"];

export const statusChangeSchema = z
  .object({
    status: z.enum(RECRUITER_STATUSES, { error: "Choose a valid status" }),
    note: optText(1000, "Note"),
    interviewAt: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.date().optional()),
  })
  .strict()
  .refine((s) => s.status !== "interview_scheduled" || (s.interviewAt && s.interviewAt > new Date()), {
    message: "Pick a future date and time for the interview",
    path: ["interviewAt"],
  });

export const messageSchema = z.object({ body: text(2000, "Message") }).strict();

export const listingStateSchema = z.object({ action: z.enum(["publish", "close", "reopen", "draft"]) }).strict();
