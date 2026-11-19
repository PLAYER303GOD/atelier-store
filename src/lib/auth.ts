import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

// Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment.
// Sign-in methods (emailAndPassword, socialProviders, ...) are not enabled yet.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [nextCookies()], // must stay last in the plugins array
});
