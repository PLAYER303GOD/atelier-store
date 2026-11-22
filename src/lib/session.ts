// Data Access Layer for authentication: the ONLY place the app reads the session.
// Pages, Server Actions and route handlers call getCurrentUser / requireUser / requireAdmin
// here, close to the data. src/proxy.ts is only an optimistic, cookie-presence redirect.
//
// Reading the session is request data: call these inside <Suspense>, never at the top of a
// layout (see node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).

import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth, type Role, ROLES } from "@/lib/auth";

/** What the UI may know about the signed-in user: never the raw session or its token. */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** ISO string, so it serialises across the cache boundary. */
  createdAt: string;
};

const toRole = (value: unknown): Role => (ROLES.includes(value as Role) ? (value as Role) : "customer");

/** Reads the session from the DB on every call. Authorization decisions use this. */
async function readCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toRole(user.role),
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

/**
 * The signed-in user, or null, cached per browser with `use cache: private` (never in a
 * server cache). For non-gating UI only (e.g. "already signed in → skip the form"): in dev the
 * private cache serves the previous result while it refreshes, so it can be one request stale.
 * Never use it to decide access; requireUser / requireAdmin read fresh.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";
  return readCurrentUser();
}

/** Only same-site paths ("/account"), never "//host", "/\host" or absolute URLs: no open redirects. */
export function safeReturnTo(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

/** The signed-in user; anyone else is sent to sign-in and brought back to `returnTo`. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  // Fresh, not cached: sign-out elsewhere, role changes and profile edits apply immediately.
  const user = await readCurrentUser();
  if (!user) redirect(`/sign-in?${new URLSearchParams({ next: safeReturnTo(returnTo) })}`);
  return user;
}

/**
 * An admin. Signed-out visitors go to sign-in; signed-in non-admins get a 404, so admin
 * routes don't reveal they exist. Every admin Server Action / route handler must call this
 * itself rather than trust the page that rendered it.
 */
export async function requireAdmin(returnTo = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (user.role !== "admin") notFound();
  return user;
}
