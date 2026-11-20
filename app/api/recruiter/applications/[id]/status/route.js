import { recruiterRoute } from "@/lib/recruiter/route";
import { statusChangeSchema } from "@/lib/validations/recruiter";
import { changeApplicationStatus } from "@/services/recruiter";

/** POST /api/recruiter/applications/:id/status — move a candidate through the pipeline. */
export const POST = recruiterRoute(({ user, data, params }) => changeApplicationStatus(user, params.id, data), { schema: statusChangeSchema });
