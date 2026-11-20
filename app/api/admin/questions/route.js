import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin/route";
import { questionSchema } from "@/lib/validations/admin";
import { createQuestion } from "@/services/adminContent";

export const POST = adminRoute(async ({ user, data }) => NextResponse.json(await createQuestion(user, data), { status: 201 }), { schema: questionSchema });
