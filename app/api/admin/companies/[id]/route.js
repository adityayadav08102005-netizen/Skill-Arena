import { adminRoute } from "@/lib/admin/route";
import { companyDecisionSchema } from "@/lib/validations/admin";
import { decideCompany } from "@/services/admin";

/** Verify, decline or un-verify a company. */
export const POST = adminRoute(({ user, data, params }) => decideCompany(user, params.id, data), { schema: companyDecisionSchema });
