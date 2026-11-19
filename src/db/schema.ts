// Single entry point for all Drizzle tables (used by the app and drizzle-kit).
//
// Better Auth tables are not created yet. When ready:
//   1. npm run auth:generate           -> writes src/db/auth-schema.ts
//   2. add: export * from "./auth-schema";
//   3. npm run db:generate && npm run db:migrate
export * from "./catalog-schema";
