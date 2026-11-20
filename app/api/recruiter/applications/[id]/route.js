import { recruiterRoute } from "@/lib/recruiter/route";
import { getApplicant } from "@/services/recruiter";

/** GET /api/recruiter/applications/:id — an applicant's profile, stats and history for your listing. */
export const GET = recruiterRoute(({ user, params }) => getApplicant(user, params.id), { limit: 120 });
