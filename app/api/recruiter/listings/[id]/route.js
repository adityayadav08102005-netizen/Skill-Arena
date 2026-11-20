import { recruiterRoute } from "@/lib/recruiter/route";
import { opportunitySchema } from "@/lib/validations/recruiter";
import { deleteListing, updateListing } from "@/services/recruiter";

/** PATCH edits one of your listings; DELETE removes it (only if nobody applied). */
export const PATCH = recruiterRoute(({ user, data, params }) => updateListing(user, params.id, data), { schema: opportunitySchema, limit: 30 });
export const DELETE = recruiterRoute(({ user, params }) => deleteListing(user, params.id));
