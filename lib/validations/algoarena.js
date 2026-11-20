import { z } from "zod";
import { LANGUAGE_KEYS } from "@/lib/execution/languages";

const slug = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Invalid problem");
const language = z.enum(LANGUAGE_KEYS, { error: "Choose Python, Java, C++ or JavaScript" });
const code = z.string().min(1, "Write some code first").max(64_000, "Code must be under 64,000 characters");

export const runSchema = z
  .object({
    slug,
    language,
    code,
    customInput: z.string().max(10_000, "Custom input must be under 10,000 characters").optional(),
  })
  .strict();

export const submitSchema = z.object({ slug, language, code }).strict();

/** Contest run/submit: the contest comes from the URL, the problem from the body. */
export const contestRunSchema = z
  .object({ problemSlug: slug, language, code, customInput: z.string().max(10_000, "Custom input must be under 10,000 characters").optional() })
  .strict();
export const contestSubmitSchema = z.object({ problemSlug: slug, language, code }).strict();
