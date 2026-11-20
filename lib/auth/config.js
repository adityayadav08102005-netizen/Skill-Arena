import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { ObjectId } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

/**
 * Builds the Better Auth instance. Kept free of `server-only` so the seed
 * script can reuse the exact same configuration from plain Node.
 *
 * Security notes:
 *  - `role` has `input: false`: no sign-up or update request can set it.
 *    Every account starts as a student; the one-time setup step (Phase 2)
 *    may switch it to recruiter through a server route. Admin is granted
 *    only by `npm run make-admin`.
 *  - `banned` (also `input: false`) is set by admins. Suspended accounts
 *    can't start a session: the session hook below refuses them, and the
 *    admin action deletes their existing sessions.
 *  - Google is enabled only when both OAuth credentials are configured.
 */
export function createAuth({ client, dbName, onUserCreated }) {
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return betterAuth({
    appName: "SkillArena",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: mongodbAdapter(client.db(dbName), { client }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    socialProviders: googleConfigured
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
          },
        }
      : {},
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "student", input: false },
        banned: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh daily
    },
    rateLimit: {
      enabled: true,
      // Stored in MongoDB ("rateLimit" collection) so limits hold across server instances.
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const id = ObjectId.isValid(String(session.userId)) ? new ObjectId(String(session.userId)) : session.userId;
            const user = await client.db(dbName).collection("user").findOne({ _id: id }, { projection: { banned: 1 } });
            if (user?.banned) throw new APIError("FORBIDDEN", { message: "This account is suspended. Contact the SkillArena team if you think this is a mistake." });
          },
        },
      },
      user: {
        create: {
          after: async (user) => {
            if (onUserCreated) await onUserCreated(user);
          },
        },
      },
    },
    plugins: [nextCookies()], // must stay last
  });
}
