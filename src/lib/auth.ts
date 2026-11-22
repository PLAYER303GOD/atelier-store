import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

/** Values of `users.role`. Only the server sets it (see `input: false`); `pnpm auth:make-admin` promotes. */
export const ROLES = ["customer", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment.
// Don't import "server-only" here: the Better Auth CLI loads this file (`pnpm auth:generate`).
// Read the session through src/lib/session.ts, never by calling auth.api.getSession() in pages.
export const auth = betterAuth({
  // usePlural → users / sessions / accounts / verifications, matching our table convention
  // (and avoiding Postgres's reserved word "user"). The Neon HTTP driver has no
  // transactions, so the adapter's `transaction` option stays off (default).
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true, // signing up also signs in
    // No email sender yet, so no verification or password reset in v1.
  },

  user: {
    additionalFields: {
      // input: false → sign-up and update-user requests can't set it (no self-promotion).
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // persistent: 30 days…
    updateAge: 60 * 60 * 24, // …sliding, refreshed at most once a day while in use
    // No cookieCache: every check reads the DB, so sign-out and role changes apply immediately.
  },

  plugins: [nextCookies()], // must stay last in the plugins array
});
