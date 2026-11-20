import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/auth";

/**
 * Better Auth endpoints (/api/auth/*): email sign-up/sign-in, Google OAuth,
 * sessions and sign-out. In demo mode there is no database to hold accounts,
 * so every auth request gets a clear 503 instead of a crash.
 */
function notConfigured() {
  return NextResponse.json(
    { error: "Accounts are unavailable in demo mode. Set MONGODB_URI to enable sign-in." },
    { status: 503 },
  );
}

async function handle(request) {
  const auth = getAuth();
  if (!auth) return notConfigured();
  return toNextJsHandler(auth)[request.method](request);
}

export const GET = handle;
export const POST = handle;
