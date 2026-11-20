import { z } from "zod";

export const startSchema = z.object({ difficulty: z.enum(["mixed", "easy", "medium", "hard"], { error: "Choose a difficulty" }) }).strict();

export const saveSchema = z
  .object({
    answers: z.array(z.number().int().min(0).max(9).nullable()).max(100),
    flagged: z.array(z.number().int().min(0).max(99)).max(100).default([]),
  })
  .strict();
