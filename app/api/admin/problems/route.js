import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin/route";
import { problemSchema } from "@/lib/validations/admin";
import { createProblem } from "@/services/adminContent";

export const POST = adminRoute(async ({ user, data }) => NextResponse.json(await createProblem(user, data), { status: 201 }), { schema: problemSchema });
