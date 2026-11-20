import { z } from "zod";
import { adminRoute } from "@/lib/admin/route";
import { problemSchema } from "@/lib/validations/admin";
import { deleteProblem, getProblemAdmin, setProblemPublished, updateProblem } from "@/services/adminContent";

/** GET includes hidden tests (admin only); PATCH edits; POST toggles publishing; DELETE only if unused. */
export const GET = adminRoute(({ params }) => getProblemAdmin(params.id));
export const PATCH = adminRoute(({ user, data, params }) => updateProblem(user, params.id, data), { schema: problemSchema });
export const POST = adminRoute(({ user, data, params }) => setProblemPublished(user, params.id, data.isPublished), { schema: z.object({ isPublished: z.boolean() }).strict() });
export const DELETE = adminRoute(({ user, params }) => deleteProblem(user, params.id));
