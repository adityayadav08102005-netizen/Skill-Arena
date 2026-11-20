import { recruiterRoute } from "@/lib/recruiter/route";
import { companySchema } from "@/lib/validations/recruiter";
import { updateCompany } from "@/services/recruiter";

/** PATCH /api/recruiter/company — update your company profile. */
export const PATCH = recruiterRoute(({ user, data }) => updateCompany(user, data), { schema: companySchema });
