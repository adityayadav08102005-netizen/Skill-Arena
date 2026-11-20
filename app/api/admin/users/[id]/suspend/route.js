import { adminRoute } from "@/lib/admin/route";
import { userSuspendSchema } from "@/lib/validations/admin";
import { setUserSuspended } from "@/services/admin";

/** Suspend (signs the user out everywhere) or restore an account. */
export const POST = adminRoute(({ user, data, params }) => setUserSuspended(user, params.id, data), { schema: userSuspendSchema });
