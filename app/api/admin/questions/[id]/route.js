import { adminRoute } from "@/lib/admin/route";
import { questionSchema } from "@/lib/validations/admin";
import { deleteQuestion, updateQuestion } from "@/services/adminContent";

/** PATCH edits a question (including activating or deactivating it); DELETE only if never answered. */
export const PATCH = adminRoute(({ user, data, params }) => updateQuestion(user, params.id, data), { schema: questionSchema });
export const DELETE = adminRoute(({ user, params }) => deleteQuestion(user, params.id));
