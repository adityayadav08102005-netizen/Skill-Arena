import { adminRoute } from "@/lib/admin/route";
import { contestSchema } from "@/lib/validations/admin";
import { deleteContest, updateContest } from "@/services/adminContent";

/** PATCH edits a contest (locked fields once it starts); DELETE only before it starts and with no registrations. */
export const PATCH = adminRoute(({ user, data, params }) => updateContest(user, params.id, data), { schema: contestSchema });
export const DELETE = adminRoute(({ user, params }) => deleteContest(user, params.id));
