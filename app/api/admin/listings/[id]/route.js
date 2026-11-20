import { adminRoute } from "@/lib/admin/route";
import { listingDecisionSchema } from "@/lib/validations/admin";
import { decideListing } from "@/services/admin";

/** Approve, send back or take down a listing. */
export const POST = adminRoute(({ user, data, params }) => decideListing(user, params.id, data), { schema: listingDecisionSchema });
