import { recruiterRoute } from "@/lib/recruiter/route";
import { listingStateSchema } from "@/lib/validations/recruiter";
import { setListingState } from "@/services/recruiter";

/** POST /api/recruiter/listings/:id/state — publish, close, reopen or move back to drafts. */
export const POST = recruiterRoute(({ user, data, params }) => setListingState(user, params.id, data.action), { schema: listingStateSchema });
