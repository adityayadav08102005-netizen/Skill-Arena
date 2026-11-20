import { NextResponse } from "next/server";
import { recruiterRoute } from "@/lib/recruiter/route";
import { opportunitySchema } from "@/lib/validations/recruiter";
import { createListing } from "@/services/recruiter";

/** POST /api/recruiter/listings — create a listing (draft, or published / sent for review). */
export const POST = recruiterRoute(async ({ user, data }) => NextResponse.json(await createListing(user, data), { status: 201 }), { schema: opportunitySchema, limit: 20 });
