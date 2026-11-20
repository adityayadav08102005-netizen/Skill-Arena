import { adminRoute } from "@/lib/admin/route";
import { reportDecisionSchema } from "@/lib/validations/admin";
import { decideReport } from "@/services/admin";

/** Dismiss a report, or take the reported item down. */
export const POST = adminRoute(({ user, data, params }) => decideReport(user, params.id, data), { schema: reportDecisionSchema });
