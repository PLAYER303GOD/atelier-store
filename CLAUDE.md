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
- `pnpm auth:generate` — Better Auth CLI (`auth` package) → writes `src/db/auth-schema.ts` (generated; never hand-edit)
- `pnpm auth:make-admin <email> [--revoke]` — set a user's `role` to admin (or back to customer); roles are never settable from the client
- `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` — drizzle-kit (migrations go to `./drizzle`)
- `pnpm db:seed` — loads the sample catalogue from `src/db/seed-data.ts` (idempotent upserts; runs via `tsx`, reads `.env.local`)

No test framework is set up yet.

Env vars live in `.env.local` (template: `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STRIPE_SECRET_KEY` (a sandbox restricted key `rk_…`; only checkout needs it), `APP_URL` (origin for Stripe's return URLs; falls back to `BETTER_AUTH_URL`). `next build` needs `DATABASE_URL` set because `src/db/index.ts` throws at import if it's missing.

## Architecture

- `src/db/index.ts` — single Drizzle client using the Neon **HTTP** driver (`drizzle-orm/neon-http`). It has no interactive transactions; switch to `drizzle-orm/neon-serverless` (WebSocket `Pool`) if needed.
- `src/db/catalog-schema.ts` — `categories` 1──< `products` 1──1 `stocks`, and `products` >──< `collections` through `product_collections`. A category is a product's one type (Knitwear); a collection is a curated, overlapping grouping (Women, Men, Gifts). Prices are integer cents (`price_cents`); `details` is `text[]`, `images` is `jsonb` (`[{src, alt}, …]`, first is the card shot). No variants yet.
- `src/db/order-schema.ts` — `users` 1──< `orders` 1──< `order_items` >──1 `products`, plus `stripe_events` (webhook dedup ledger, by `evt_…` id). An order belongs to a signed-in user (`restrict`) and has a public `reference`. `status` is one of `ORDER_STATUSES` (`pending` → `processing` → `paid`, or `failed` / `expired` / `canceled`, which return held stock). Stripe ids are explicit columns (`stripe_checkout_session_id`, `stripe_payment_intent_id`, both unique and prefix-checked). A `paid` order must have `paid_at`, `amount_paid_cents` and a session id (a `check()`). `order_items` snapshot name, colour, image and `unit_price_cents`, so orders never follow catalogue edits; an ordered product can't be deleted (`restrict`). Postgres reports a `restrict` FK as `23001`, not `23503`. Checkout itself (Stripe-hosted Checkout, webhook-confirmed) is not built yet.
- `src/lib/products.ts` — server-only catalogue queries (`getProduct`, `getNewArrivals`, `getRelatedProducts`, `getProductsBySlugs`, `getProductSlugs`, `getCategory`, `getCategoryProducts`, `getCategorySlugs`, `getCategorySummaries`, `getCollection`, `getCollectionProducts`, `getCollectionSlugs`, `searchProducts`). Each uses `"use cache"` + `cacheTag("products")` + `cacheLife("minutes")`; call `updateTag("products")` after any write. `src/lib/catalog.ts` holds the `Product` type and client-safe helpers only and must not import the DB, because client components import it.
- Listing pages: `/new-in`, `/[category]` (root-level, matching `categoryHref`) and `/collections/[slug]` all render `ProductListing` / `ProductListingSkeleton` from `src/components/product/product-listing.tsx`. Static routes win over `[category]`; other unknown first segments hit `notFound()`.
- Journal: stories (campaigns, editorial) are content in `src/lib/journal.ts`, rendered by `JournalStory` (`src/components/journal/`). Each story has its **own static route** (`src/app/journal/<slug>/page.tsx`), not a `[slug]` route: the full-bleed hero must render outside `<Suspense>` so its `data-header-overlay` is in the first paint, and a dynamic route would have to put it inside one. Add a story by adding it to `stories` and a two-line route folder. `/journal` lists them all.
- `src/app/api/products/route.ts` — `GET /api/products?slug=…` for the `/saved` page (client side, slugs come from localStorage).
- `src/db/schema.ts` — the one entry point for all tables. Both the app client and `drizzle.config.ts` read it, so new table files must be re-exported from here.
- `src/lib/auth.ts` — Better Auth: email + password, `drizzleAdapter(..., { usePlural: true })` (tables `users`, `sessions`, `accounts`, `verifications`), a `role` field (`customer` | `admin`, `input: false`), 30-day sliding sessions, no cookie cache. `nextCookies()` must stay the **last** plugin. No email sender yet, so no verification or password reset.
- `src/lib/session.ts` — the **only** place the app reads the session. `requireUser(returnTo)` / `requireAdmin()` read it fresh on every call: use them for every access decision, in the page *and* in any Server Action or route handler that writes. `requireAdmin` sends non-admins to a 404. `getCurrentUser()` is cached with `use cache: private`, which in dev serves the previous result while it refreshes (one request stale), so use it only for non-gating UI. `safeReturnTo()` sanitises `next` (same-site paths only).
- Header account link (`src/components/site/account-link.tsx`) shows the signed-in first name using the client `authClient.useSession()`, never a server session read, so the header stays in every page's static shell. It updates by itself on sign-in, sign-out and name changes. It uses `Button`'s `icon-label` size.
- Shopping bag ("bag" in the UI, "cart" in code): `src/db/cart-schema.ts` defines `carts` 1──< `cart_items` >──1 `products`. A cart line stores **product + quantity only, never a price**, so the bag always shows current prices. Quantities run 1–10 (`MAX_PER_LINE`, also a `check()`).
  - **Owner:** signed in → the account's cart (`carts.user_id`, one per user). Signed out → the guest cart whose `token` is in the httpOnly `atelier_cart` cookie *and* has no user, so a leftover cookie never opens an account bag. At sign-in/sign-up a Better Auth `hooks.after` in `src/lib/auth.ts` merges the guest cart into the account cart (quantities summed, clamped) and clears the cookie; the next bag write retries if that failed.
  - `src/lib/cart-store.ts`: plain DB functions (no `server-only`, no `next/*`, because `auth.ts` imports it). Stock is read live, never from the cached catalogue, and every write clamps to `min(stock, MAX_PER_LINE)` **inside the SQL statement**, so concurrent clicks can't overshoot.
  - `src/lib/cart.ts` (server-only): `getBag()` / `getBagCount()`, read inside `<Suspense>`. Totals are computed here in cents. Rendering never writes: if stock fell, a line reports `reduced` / `unavailable`, and the next write stores the fix.
  - `src/lib/cart-actions.ts` (`"use server"`): `addToBag`, `updateBagQuantity`, `removeFromBag`. They validate input, act only on the caller's own cart (never a cart id from the client), create the guest cookie lazily, and end with `refresh()`.
  - UI: `/bag`, `AddToBagButton` on the product page, and `BagLink` (header count, inside its own `<Suspense>` so the header stays static).
  - `BagFeedback` wraps the bag, list *and* empty state. After a remove, the line and its button are gone, so focus moves to its status notice ("… was removed · Undo", no auto-dismiss) instead of falling to `<body>`; Undo re-adds the same quantity through `addToBag`. Line controls announce only their own changes, and the quantity `<output>` is not a live region, because every line would re-announce on any change.
  - Follow-up: purge old guest carts (`user_id is null` and stale `updated_at`).
- Checkout (Stripe-hosted Checkout, signed-in only): `src/lib/checkout-actions.ts` `startCheckout(signature)` closes the user's earlier pending checkout, re-reads the bag live (`toBag` in `cart.ts`, shared with the page), refuses on unavailable lines or a changed `bag.signature` (compared only, never priced from), then `createOrderWithHold` (`src/lib/order-store.ts`) creates the order, its price snapshot and the stock hold in one `db.batch` transaction. A shortfall trips `stocks_quantity_non_negative` (23514) and rolls back. The Checkout Session is built only from the order snapshot, with no `payment_method_types` and no `automatic_tax`. `releaseOrder` closes an open order *and* returns its stock in one statement (exactly once). Stripe config is resolved before anything is written.
  - Return URLs: success → `/checkout/success?session_id=…`, which **only reads** (status from the DB; while pending it asks Stripe for wording only). Cancel → `/bag?checkout=canceled&order=…`, whose notice calls `cancelCheckout` to free the hold.
  - **Not built yet:** the webhook (`/api/stripe/webhook`) that marks orders paid / failed / expired, clears the bag and records `stripe_events`. Until then orders stay `pending` and a hold is freed only by a new checkout or cancel.
- `src/proxy.ts` — optimistic redirect to `/sign-in?next=…` for `/account/*` and `/admin/*` when there is no session cookie (no DB lookup). It is not the security check; `session.ts` is.
- Account area: `/sign-in` and `/sign-up` (`AuthPage` + `AuthForm`, with the `AuthVisual` photo panel; links between them use the `auth-switch` transition type). `/account` has a static layout with `AccountNav` and pages that call `requireUser` inside `<Suspense>`: Overview and Personal details (name edit via `authClient.updateUser`). There's no order history yet. `/admin` is a read-only catalogue overview behind `requireAdmin`.
- Auth tables are owned by the CLI, so they keep Better Auth's text ids and timestamps (exceptions to the DB conventions below), and `role` has no `check()`.
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
- Keep scope minimal: no reviews, wishlists or variants until asked. Orders exist as tables only; checkout and payments are being added in steps.

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

Shared primitives live in `src/components/ui/`: `Button` (plus `buttonStyles()` for styling a `<Link>`), `TextLink`, `Container`, `ProductGrid`, `MediaFrame`, `SectionHeader`, `Breadcrumbs`, `Disclosure` (an accordion built on native `<details>`), `FullBleedHero` (the homepage/campaign hero with the transparent header), `TextField` / `PasswordField` (underlined inputs with `error`, `hint`, `notice`, an `action` slot; `PasswordField` adds show/hide and a Caps Lock warning), and `SmoothImage`. Forms use `noValidate` and pass their own `error` messages (see `src/components/account/auth-form.tsx`): errors appear after a field is left or on submit, clear as soon as they're fixed, and submit focuses the first invalid field. While a request runs, lock fields with `readOnly` and the button with `aria-disabled`, not `disabled`, which drops keyboard focus. `SmoothImage` is a `next/image` that fades in once loaded; use it for photos. If you put a transition class on it, include `opacity`, e.g. `transition-[opacity,scale]`, or the fade is lost.

Motion: the `ease-standard` and `ease-out-soft` easings, `animate-rise` / `animate-hero-zoom` / `animate-pop`, and the `reveal` utility (fade-up on scroll, a no-op without scroll-driven animation support). View transitions use React `<ViewTransition>`:
- product images morph from card to product page via a shared name (`productImageTransition(slug)`)
- the product page's skeleton and content use the `slide-down` / `slide-up` classes defined in globals.css

All motion is disabled under `prefers-reduced-motion`.

Saved items ("save for later") live in `localStorage` via `src/lib/saved-items.ts` (`useSavedItems()`, `toggleSaved()`). `useSavedItems()` returns `null` until hydrated, so render a neutral state for `null`. The UI is `SaveButton` (product page and card heart), `SavedLink` (header count) and the `/saved` page. Move it to the database once accounts exist. Merge classes with `cn` from `src/lib/cn.ts`. It only joins strings and does not resolve conflicting Tailwind classes. Never pass a class that overrides one a primitive already sets (for example `hidden` on top of `buttonStyles()`'s `inline-flex`). Put visibility on a wrapper element, or add a variant.

Site chrome (header, mobile menu, footer) is in `src/components/site/`. The header is solid by default. A page gets the transparent-over-hero header by rendering its hero with `-mt-header`, a `data-header-overlay` attribute (used for the first paint) and `<HeaderOverlay />` inside it (used after hydration); see `src/components/home/hero.tsx`.

Don't detect the hero with CSS `:has()` alone. Next keeps visited pages in the DOM (hidden by `<Activity>`), so the check would match a hidden homepage and make the header invisible on other pages. `HeaderOverlay`'s effect cleanup runs when its page is hidden.

`HeaderShell` sets `data-scrolled`, `data-hidden` (it hides on scroll down and returns on scroll up), `html[data-header-hidden]` and `html[data-header-ready]`. The `header-overlay:` variant in globals.css does all the styling. Hover only counts on `(hover: hover)` devices, and only `:focus-visible` (not `:focus-within`) keeps the header solid. Sticky content should use `top-[calc(var(--header-offset)+…)]` so it moves up when the header hides. If the header rows change height, update `--header-height` in globals.css. The homepage sections are in `src/components/home/`. Products, categories and stock come from Postgres (see Architecture). Homepage editorial content (`hero`, `editorial`, `featuredCollections`) is in `src/lib/catalog.ts`, and navigation and service copy in `src/lib/site.ts`. Each featured collection's `slug` must exist in `seedCollections`, because its tile links to `/collections/<slug>`. Remote images are allowed only from `images.unsplash.com/photo-*` (`next.config.ts`). Use the `preload` prop on `next/image`; `priority` was replaced in Next 16.

## Gotchas

- **Changing Better Auth options or plugins** changes its schema: run `pnpm auth:generate && pnpm db:generate`, read the SQL, then `pnpm db:migrate`. Until then `/api/auth/*` returns 500 (`SCHEMA_MISMATCH`).
- **`BETTER_AUTH_URL` must match the dev server's origin** (`http://localhost:3001`). Otherwise every sign-in/sign-up from the site gets 403 `INVALID_ORIGIN`.
- **Dev server stuck reloading:** after many edits while `next dev` runs (especially new `"use server"` files), Turbopack can loop: `building → built → reloadPage` on every load, so pages reload about every 0.5s and browser tests time out. Restart `pnpm dev`. Check with a quiet page: a healthy one loads once.
- **Testing in a browser:** Next keeps visited pages in the DOM, hidden by `<Activity>`. Scripts that query the DOM must pick *visible* elements (`checkVisibility()`), or they'll find a hidden page's form. Test users: `auth-test+…@example.com`; delete them afterwards.
- `src/lib/auth.ts` and `src/db/index.ts` must **not** import `server-only` — the Better Auth CLI can't load files that do. Only import them from server code.
- The `@better-auth/cli` package is deprecated; the CLI is the `auth` devDependency, which should stay at the same version as `better-auth`.
- **Catalogue setup:** run `pnpm db:migrate && pnpm db:seed` before `next build` or `next dev`. `generateStaticParams` on `/products/[slug]`, `/[category]` and `/collections/[slug]` must return at least one slug under Cache Components, so an empty `products` table fails the build.
- `pnpm-workspace.yaml` sets `allowBuilds: esbuild: false`. pnpm blocks esbuild's install script, and `tsx`/`drizzle-kit` work without it. Leave it unless a tool actually fails.
- `next dev` re-adds the managed block in AGENTS.md; don't remove it.
- **Dynamic routes and `params`:** `partialPrefetching` is on, so pages must not await `params`/`searchParams` outside `<Suspense>`. If they do, dev shows "Next.js encountered URL data during prerendering". Pass the promise to a child inside `<Suspense>` with a skeleton fallback, as in `src/app/products/[slug]/page.tsx`. `dynamicParams` isn't allowed with Cache Components; call `notFound()` for unknown params. Those responses are status 200 with `noindex`, because the 404 happens after streaming has started.
- **Sample images:** before using an Unsplash photo, check it at full size for brand labels, logos or signature hardware. Several of these were too small to see in thumbnails.
