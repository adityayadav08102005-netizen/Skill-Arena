"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. Same-origin, so no base URL or secret is needed here.
 * Used by the login and register pages (Phase 2).
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
