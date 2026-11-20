# Atelier Store -1

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Better Auth · Drizzle ORM · Neon Postgres

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run dev
```

## Structure

```
src/
  app/
    api/auth/[...all]/route.ts   Better Auth HTTP handler (/api/auth/*)
    layout.tsx, page.tsx
  db/
    index.ts                     Drizzle client (Neon serverless HTTP driver)
    schema.ts                    Entry point for all tables
  lib/
    auth.ts                      Better Auth server instance (Drizzle adapter, pg)
    auth-client.ts               Better Auth React client
drizzle.config.ts                drizzle-kit config (migrations -> ./drizzle)
```

## Scripts

| Script                  | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Start dev server                                     |
| `npm run build`         | Production build                                     |
| `npm run lint`          | ESLint                                               |
| `npm run typecheck`     | TypeScript check                                     |
| `npm run auth:generate` | Generate Better Auth tables -> `src/db/auth-schema.ts` |
| `npm run db:generate`   | Create SQL migration from schema                     |
| `npm run db:migrate`    | Apply migrations to the database                     |
| `npm run db:push`       | Push schema directly (prototyping only)              |
| `npm run db:studio`     | Open Drizzle Studio                                  |

## Next steps

1. Create auth tables: `npm run auth:generate`, add `export * from "./auth-schema";` to `src/db/schema.ts`, then `npm run db:generate && npm run db:migrate`.
2. Enable sign-in methods (e.g. `emailAndPassword`, `socialProviders`) in `src/lib/auth.ts`.

## Notes

- `src/lib/auth.ts` and `src/db/index.ts` intentionally do not import `server-only`: the Better Auth CLI cannot load files that do. Import them only from server code.
- The Neon HTTP driver does not support interactive transactions. Switch to `drizzle-orm/neon-serverless` (WebSocket `Pool`) if you need them.
