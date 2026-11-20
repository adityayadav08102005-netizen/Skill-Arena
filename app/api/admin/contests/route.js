import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin/route";
import { contestSchema } from "@/lib/validations/admin";
import { createContest } from "@/services/adminContent";

export const POST = adminRoute(async ({ user, data }) => NextResponse.json(await createContest(user, data), { status: 201 }), { schema: contestSchema });
