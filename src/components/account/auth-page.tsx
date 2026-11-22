import { redirect } from "next/navigation";
import { Suspense, ViewTransition } from "react";

import { AuthForm } from "@/components/account/auth-form";
import { AuthVisual } from "@/components/account/auth-visual";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getCurrentUser, safeReturnTo } from "@/lib/session";

type Mode = "sign-in" | "sign-up";

const copy = {
  "sign-in": { crumb: "Sign in", title: "Sign in", intro: "Welcome back. Sign in to see your account." },
  "sign-up": { crumb: "Create account", title: "Create an account", intro: "Save your details for a faster visit next time." },
} as const;

/**
 * Shared frame for /sign-in and /sign-up: the form on the left, an editorial photo panel on
 * the right from 768px (AuthVisual). The heading is in the static shell; `next` (URL data)
 * and the session (request data) are read inside <Suspense>. Already signed in → go to `next`.
 *
 * Switching between the two pages (links tagged with the "auth-switch" transition type) slides
 * the form column out and in with the site's slide-down / slide-up pair, while the photo panel
 * crossfades. Other navigations (typed or not) don't animate this column.
 */
export function AuthPage({ mode, searchParams }: { mode: Mode; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const text = copy[mode];
  return (
    // 2.25rem = announcement bar: on large screens the split fills the first screen exactly.
    <div className="mx-auto grid max-w-(--container-page) md:min-h-[calc(100svh-var(--header-height)-2.25rem)] md:grid-cols-2">
      {/* A shared name (not enter/exit): both pages stay mounted under <Activity>, so the
          column is a pair that swaps; `share` keyed on the type keeps other navigations still. */}
      <ViewTransition name="auth-form" share={{ "auth-switch": "auth-form", default: "none" }} default="none">
        <div className="px-gutter pt-4 pb-section md:pt-6 md:pr-10 lg:pr-16 xl:pr-24">
          <Breadcrumbs
            className="mb-6 md:mb-10 lg:mb-16"
            items={[{ label: "Home", href: "/" }, { label: text.crumb }]}
          />
          <div className="max-w-md">
            <p className="mb-2 text-caption text-muted uppercase">Your account</p>
            <h1 className="mb-2 text-display-sm">{text.title}</h1>
            <p className="mb-8 text-body text-muted md:mb-10">{text.intro}</p>
            <Suspense fallback={<FormSkeleton fields={mode === "sign-up" ? 3 : 2} />}>
              <AuthContent mode={mode} searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </ViewTransition>
      <AuthVisual mode={mode} />
    </div>
  );
}

async function AuthContent({ mode, searchParams }: { mode: Mode; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next;
  const next = safeReturnTo(Array.isArray(raw) ? raw[0] : raw);
  if (await getCurrentUser()) redirect(next);
  return <AuthForm mode={mode} next={next} />;
}

function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-busy="true" aria-label="Loading form" className="space-y-6">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <div className="h-3 w-16 bg-surface" />
          <div className="mt-2 h-12 border-b border-line" />
        </div>
      ))}
      <div className="h-12 bg-surface" />
    </div>
  );
}
