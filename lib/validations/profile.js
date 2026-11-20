import { z } from "zod";
import { optDate, optText, optUrl, optYear, text } from "./common";

/*
 * Every profile write goes through these schemas. They are `.strict()`, so
 * server-managed fields (xp, level, streak, role, onboardingComplete …) are
 * rejected outright instead of being silently accepted.
 */

export const onboardingSchema = z.discriminatedUnion("role", [
  z
    .object({
      role: z.literal("student"),
      college: text(160, "College name"),
      graduationYear: optYear("Graduation year").refine((v) => v !== undefined, "Graduation year is required"),
    })
    .strict(),
  z
    .object({
      role: z.literal("recruiter"),
      companyName: text(120, "Company name"),
      jobTitle: text(120, "Job title"),
    })
    .strict(),
]);

const githubUsername = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "") || undefined : v),
  z.string().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i, "Enter a valid GitHub username").optional(),
);

const codeforcesHandle = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.string().regex(/^[\w.-]{3,24}$/, "Enter a valid Codeforces handle").optional(),
);

const linkedinUrl = optUrl("LinkedIn URL").refine(
  (v) => v === undefined || /^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(v),
  "LinkedIn URL must be a linkedin.com link",
);

export const basicsSchema = z
  .object({
    fullName: text(120, "Full name"),
    headline: optText(160, "Headline"),
    bio: optText(2000, "Bio"),
    location: optText(120, "Location"),
    college: optText(160, "College"),
    degree: optText(80, "Degree"),
    department: optText(120, "Department"),
    graduationYear: optYear("Graduation year"),
    preferredRoles: z.array(z.string().trim().min(1).max(80)).max(10, "Add up to 10 preferred roles").optional(),
    jobTitle: optText(120, "Job title"),
    githubUsername,
    linkedinUrl,
    codeforcesHandle,
  })
  .strict();

export const skillsSchema = z
  .object({
    skills: z
      .array(
        z
          .object({
            name: text(60, "Skill name"),
            proficiency: z.number().int().min(1).max(5),
          })
          .strict(),
      )
      .max(40, "Add up to 40 skills"),
  })
  .strict();

const educationItem = z
  .object({
    institution: text(160, "Institution"),
    degree: optText(80, "Degree"),
    fieldOfStudy: optText(120, "Field of study"),
    startYear: optYear("Start year"),
    endYear: optYear("End year"),
    grade: optText(40, "Grade"),
  })
  .strict()
  .refine((e) => !e.startYear || !e.endYear || e.endYear >= e.startYear, { message: "End year can't be before start year", path: ["endYear"] });

const experienceItem = z
  .object({
    title: text(120, "Title"),
    organization: text(120, "Organization"),
    type: z.enum(["internship", "job", "freelance", "volunteer", "other"]).default("internship"),
    startDate: optDate,
    endDate: optDate,
    description: optText(2000, "Description"),
  })
  .strict()
  .refine((e) => !e.startDate || !e.endDate || e.endDate >= e.startDate, { message: "End date can't be before start date", path: ["endDate"] });

const projectItem = z
  .object({
    title: text(120, "Project title"),
    description: optText(2000, "Description"),
    techStack: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
    repoUrl: optUrl("Repository link"),
    liveUrl: optUrl("Live link"),
  })
  .strict();

export const educationSchema = z.object({ education: z.array(educationItem).max(10) }).strict();
export const experienceSchema = z.object({ experience: z.array(experienceItem).max(20) }).strict();
export const projectsSchema = z.object({ projects: z.array(projectItem).max(20) }).strict();

const VISIBILITY_KEYS = ["email", "resume", "education", "experience", "projects", "codingStats", "assessmentScores", "github", "linkedin"];

export const privacySchema = z
  .object({
    isPublic: z.boolean(),
    visibility: z.object(Object.fromEntries(VISIBILITY_KEYS.map((k) => [k, z.boolean()]))).strict(),
  })
  .strict();

export const goalsSchema = z
  .object({
    weeklyProblems: z.number().int().min(1, "At least 1 problem a week").max(50, "At most 50 problems a week"),
    weeklyActiveDays: z.number().int().min(1, "At least 1 day a week").max(7, "A week has 7 days"),
    monthlyXp: z.number().int().min(50, "At least 50 XP a month").max(20000, "At most 20,000 XP a month"),
  })
  .strict();

/** Section name → schema, used by PATCH /api/profile/[section]. */
export const PROFILE_SECTIONS = {
  goals: goalsSchema,
  basics: basicsSchema,
  skills: skillsSchema,
  education: educationSchema,
  experience: experienceSchema,
  projects: projectsSchema,
  privacy: privacySchema,
};
