import { adminRoute } from "@/lib/admin/route";
import { userRoleSchema } from "@/lib/validations/admin";
import { setUserRole } from "@/services/admin";

/** Switch an account between student and recruiter (admin is CLI-only). */
export const POST = adminRoute(({ user, data, params }) => setUserRole(user, params.id, data), { schema: userRoleSchema });
