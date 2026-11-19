import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local, add your Neon connection string, " +
      "run `pnpm db:migrate && pnpm db:seed`, then restart `pnpm dev`.",
  );
}

// Neon serverless HTTP driver: one query per request, no interactive transactions.
// Switch to `drizzle-orm/neon-serverless` (WebSocket Pool) if you need them.
export const db = drizzle({
  client: neon(process.env.DATABASE_URL),
  schema,
});
