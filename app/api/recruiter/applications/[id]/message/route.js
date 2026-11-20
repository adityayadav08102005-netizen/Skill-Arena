import { recruiterRoute } from "@/lib/recruiter/route";
import { messageSchema } from "@/lib/validations/recruiter";
import { messageCandidate } from "@/services/recruiter";

/** POST /api/recruiter/applications/:id/message — message a shortlisted candidate (shown in their inbox and applications). */
export const POST = recruiterRoute(({ user, data, params }) => messageCandidate(user, params.id, data.body), { schema: messageSchema, limit: 20 });
