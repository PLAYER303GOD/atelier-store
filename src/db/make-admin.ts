// Promote (or demote) an existing user. Roles are never settable from the client.
//   pnpm auth:make-admin you@example.com            → role = admin
//   pnpm auth:make-admin you@example.com --revoke   → role = customer
// Takes effect on the user's next request (no session cookie cache).

import { eq, sql } from "drizzle-orm";

import { db } from "./index";
import { users } from "./schema";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();
  const role = args.includes("--revoke") ? "customer" : "admin";
  if (!email) throw new Error("Usage: pnpm auth:make-admin <email> [--revoke]");

  const updated = await db
    .update(users)
    .set({ role })
    .where(eq(sql`lower(${users.email})`, email))
    .returning({ email: users.email, role: users.role });

  if (updated.length === 0) throw new Error(`No user with email ${email}. Sign up first, then re-run.`);
  console.log(`${updated[0].email} is now ${updated[0].role}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
