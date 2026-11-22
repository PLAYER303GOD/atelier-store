# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js 16 (App Router, `src/` dir, `@/*` → `src/*`) · TypeScript · Tailwind CSS v4 (via `@tailwindcss/turbopack`) · Better Auth · Drizzle ORM · Neon Postgres. pnpm is the package manager (`pnpm-lock.yaml`); `package-lock.json` is a leftover from the initial npm setup.

Next 16 has breaking changes vs. older versions — check `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md). Notably `next.config.ts` enables `cacheComponents` and `partialPrefetching`: anything reading cookies/headers/session runs at request time and must sit behind `<Suspense>` (see `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`).

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` — ESLint
- `pnpm typecheck` — runs `next typegen` first; plain `tsc` fails because globals like `LayoutProps` are generated types
- `pnpm auth:generate` — Better Auth CLI (`auth` package) → writes `src/db/auth-schema.ts`
- `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` — drizzle-kit (migrations go to `./drizzle`)
- `pnpm db:seed` — loads the sample catalogue from `src/db/seed-data.ts` (idempotent upserts; runs via `tsx`, reads `.env.local`)

No test framework is set up yet.

Env vars live in `.env.local` (template: `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. `next build` needs `DATABASE_URL` set because `src/db/index.ts` throws at import if it's missing.

## Architecture

- `src/db/index.ts` — single Drizzle client using the Neon **HTTP** driver (`drizzle-orm/neon-http`). It has no interactive transactions; switch to `drizzle-orm/neon-serverless` (WebSocket `Pool`) if needed.
- `src/db/catalog-schema.ts` — `categories` 1──< `products` 1──1 `stocks`. Prices are integer cents (`price_cents`); `details` is `text[]`, `images` is `jsonb` (`[{src, alt}, …]`, first is the card shot). No variants/carts/orders yet.
- `src/lib/products.ts` — server-only catalogue queries (`getProduct`, `getNewArrivals`, `getRelatedProducts`, `getProductsBySlugs`, `getProductSlugs`, `getCategory`, `getCategoryProducts`, `getCategorySlugs`). Each uses `"use cache"` + `cacheTag("products")` + `cacheLife("minutes")`; call `updateTag("products")` after any write. `src/lib/catalog.ts` holds the `Product` type and client-safe helpers only and must not import the DB, because client components import it.
- Listing pages: `/new-in` and `/[category]` (root-level, matching `categoryHref`) both render `ProductListing` / `ProductListingSkeleton` from `src/components/product/product-listing.tsx`. Static routes win over `[category]`; other unknown first segments hit `notFound()`.
- `src/app/api/products/route.ts` — `GET /api/products?slug=…` for the `/saved` page (client side, slugs come from localStorage).
- `src/db/schema.ts` — the one entry point for all tables. Both the app client and `drizzle.config.ts` read it, so new table files must be re-exported from here.
- `src/lib/auth.ts` — Better Auth server instance using `drizzleAdapter(db, { provider: "pg", schema })`. `nextCookies()` must stay the **last** plugin. No sign-in methods are enabled yet.
- `src/lib/auth-client.ts` — `better-auth/react` client (same origin, no `baseURL`).
- `src/app/api/auth/[...all]/route.ts` — mounts Better Auth at `/api/auth/*`.

## Database conventions

Follow these for every new table or query unless the user says otherwise.

**Schema**
- Tables are plural snake_case (`products`, `stocks`). Give columns explicit snake_case names in `pgTable` (`integer("category_id")`); no global `casing` option is configured.
- Primary keys are `integer(...).primaryKey().generatedAlwaysAsIdentity()`. Public lookups use a unique `slug`. URLs, localStorage and the UI use slugs, never numeric ids.
- Money is an integer in minor units, named `*_cents`; never use floats or `numeric` for prices. `formatPrice()` takes cents.
- Timestamps are `timestamp(..., { withTimezone: true }).notNull().defaultNow()`. Mutable tables also get `updated_at` with `.$onUpdate(() => new Date())`.
- Enforce invariants in the database: `check()` constraints (e.g. `>= 0` for prices and quantities), `notNull`, `unique`. Every foreign key states `onDelete`: `restrict` when pointing at shared lookup data (product → category), `cascade` for rows owned by their parent (stock → product). Index foreign-key columns.
- Keep data that's always read with its parent inline: `text[]` for ordered strings, `jsonb` typed with `.$type<…>()` for small structured lists such as images. Make a separate table only when it's queried or updated on its own; stock is separate for that reason.
- Stock is 1:1 with product today (`stocks.product_id` is the PK). A missing stock row means 0 (`left join` + `coalesce`). When variants arrive, re-key stock rather than adding columns to `products`.
- Keep scope minimal: no carts, orders, payments, reviews, wishlists or variants until asked.

**Migrations and seed**
- Workflow: edit the schema → `pnpm db:generate` → read the generated SQL in `drizzle/` → `pnpm db:migrate`. Commit `drizzle/` (SQL + `meta/`). Don't use `db:push` or hand-edit applied migrations.
- `db:generate` doesn't connect, but `drizzle.config.ts` throws without `DATABASE_URL`. A placeholder value in the shell env is enough to generate.
- Seeds are idempotent: upsert on natural keys (`onConflictDoUpdate` on slug / product_id with `excluded.*`), insert parents before children, and map ids by slug from `.returning()`. Sample content belongs in `src/db/seed-data.ts`, not in app code.

**Queries**
- DB reads live in server-only modules under `src/lib/` (e.g. `src/lib/products.ts`). They map rows to the UI types in `src/lib/catalog.ts`, so components never see table shapes.
- Wrap reads in `"use cache"` + `cacheTag(<entity>)` + `cacheLife(...)`. Any future write must call `updateTag(<entity>)`. Arguments to cached functions must be serialisable (pass slugs or plain objects).
- Prefer one shared select with joins plus a mapper over the relational `db.query` API.
- Client components never import `@/db` or the query modules. When a client needs data only it knows the keys for, add a `GET` route handler under `src/app/api/` that validates and caps its input.

## Design system

All tokens are defined in `src/app/globals.css` (Tailwind v4 `@theme`); there is no `tailwind.config`.

- Tailwind's default colour, font-size, radius and shadow scales are reset, so `text-2xl`, `bg-zinc-*`, `rounded-md` and `shadow-*` produce nothing.
- Colours: `paper`, `ink`, `muted`, `subtle`, `surface`, `line`, `overlay`, `error`, `success`, `warning`.
- Type sizes: `caption`, `label`, `body-sm`, `body`, `body-lg`, `title`, `display-sm`, `display`. Use `label`/`caption` with `uppercase`. The display sizes are fluid.
- Responsive spacing: `gutter` and `section` (e.g. `px-gutter`, `py-section`).
- Containers: the `container-page` / `container-content` / `container-prose` utilities.
- Aspect ratios: `aspect-product`, `aspect-editorial`, `aspect-hero`.

Shared primitives live in `src/components/ui/`: `Button` (plus `buttonStyles()` for styling a `<Link>`), `TextLink`, `Container`, `ProductGrid`, `MediaFrame`, `SectionHeader`, `Breadcrumbs`, `Disclosure` (an accordion built on native `<details>`), and `SmoothImage`. `SmoothImage` is a `next/image` that fades in once loaded; use it for photos. If you put a transition class on it, include `opacity`, e.g. `transition-[opacity,scale]`, or the fade is lost.

Motion: the `ease-standard` and `ease-out-soft` easings, `animate-rise` / `animate-hero-zoom` / `animate-pop`, and the `reveal` utility (fade-up on scroll, a no-op without scroll-driven animation support). View transitions use React `<ViewTransition>`:
- product images morph from card to product page via a shared name (`productImageTransition(slug)`)
- the product page's skeleton and content use the `slide-down` / `slide-up` classes defined in globals.css

All motion is disabled under `prefers-reduced-motion`.

Saved items ("save for later") live in `localStorage` via `src/lib/saved-items.ts` (`useSavedItems()`, `toggleSaved()`). `useSavedItems()` returns `null` until hydrated, so render a neutral state for `null`. The UI is `SaveButton` (product page and card heart), `SavedLink` (header count) and the `/saved` page. Move it to the database once accounts exist. Merge classes with `cn` from `src/lib/cn.ts`. It only joins strings and does not resolve conflicting Tailwind classes. Never pass a class that overrides one a primitive already sets (for example `hidden` on top of `buttonStyles()`'s `inline-flex`). Put visibility on a wrapper element, or add a variant.

Site chrome (header, mobile menu, footer) is in `src/components/site/`. The header is solid by default. A page gets the transparent-over-hero header by rendering its hero with `-mt-header`, a `data-header-overlay` attribute (used for the first paint) and `<HeaderOverlay />` inside it (used after hydration); see `src/components/home/hero.tsx`.

Don't detect the hero with CSS `:has()` alone. Next keeps visited pages in the DOM (hidden by `<Activity>`), so the check would match a hidden homepage and make the header invisible on other pages. `HeaderOverlay`'s effect cleanup runs when its page is hidden.

`HeaderShell` sets `data-scrolled`, `data-hidden` (it hides on scroll down and returns on scroll up), `html[data-header-hidden]` and `html[data-header-ready]`. The `header-overlay:` variant in globals.css does all the styling. Hover only counts on `(hover: hover)` devices, and only `:focus-visible` (not `:focus-within`) keeps the header solid. Sticky content should use `top-[calc(var(--header-offset)+…)]` so it moves up when the header hides. If the header rows change height, update `--header-height` in globals.css. The homepage sections are in `src/components/home/`. Products, categories and stock come from Postgres (see Architecture). Homepage editorial content (`hero`, `editorial`, `featuredCollections`) is in `src/lib/catalog.ts`, and navigation and service copy in `src/lib/site.ts`. Remote images are allowed only from `images.unsplash.com/photo-*` (`next.config.ts`). Use the `preload` prop on `next/image`; `priority` was replaced in Next 16.

## Gotchas

- **Auth tables don't exist yet.** Better Auth validates the Drizzle schema at runtime, and `/api/auth/*` returns 500 (`SCHEMA_MISMATCH`) until you:
  1. run `pnpm auth:generate`
  2. add `export * from "./auth-schema";` to `src/db/schema.ts`
  3. run `pnpm db:generate && pnpm db:migrate`

  Re-run these steps whenever Better Auth plugins/options change.
- `src/lib/auth.ts` and `src/db/index.ts` must **not** import `server-only` — the Better Auth CLI can't load files that do. Only import them from server code.
- The `@better-auth/cli` package is deprecated; the CLI is the `auth` devDependency, which should stay at the same version as `better-auth`.
- **Catalogue setup:** run `pnpm db:migrate && pnpm db:seed` before `next build` or `next dev`. `generateStaticParams` on `/products/[slug]` and `/[category]` must return at least one slug under Cache Components, so an empty `products` table fails the build.
- `pnpm-workspace.yaml` sets `allowBuilds: esbuild: false`. pnpm blocks esbuild's install script, and `tsx`/`drizzle-kit` work without it. Leave it unless a tool actually fails.
- `next dev` re-adds the managed block in AGENTS.md; don't remove it.
- **Dynamic routes and `params`:** `partialPrefetching` is on, so pages must not await `params`/`searchParams` outside `<Suspense>`. If they do, dev shows "Next.js encountered URL data during prerendering". Pass the promise to a child inside `<Suspense>` with a skeleton fallback, as in `src/app/products/[slug]/page.tsx`. `dynamicParams` isn't allowed with Cache Components; call `notFound()` for unknown params. Those responses are status 200 with `noindex`, because the 404 happens after streaming has started.
- **Sample images:** before using an Unsplash photo, check it at full size for brand labels, logos or signature hardware. Several of these were too small to see in thumbnails.
