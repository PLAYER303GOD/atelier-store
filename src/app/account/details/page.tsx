import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AccountHeader, formatMemberSince } from "@/components/account/account-card";
import { NameForm } from "@/components/account/name-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Personal details — Atelier Store", robots: { index: false } };

/** Account information: editable name, plus the sign-in email and membership facts (read-only). */
export default function AccountDetailsPage() {
  return (
    <>
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[{ label: "Home", href: "/" }, { label: "My account", href: "/account" }, { label: "Personal details" }]}
      />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <DetailsSkeleton />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <DetailsContent />
        </ViewTransition>
      </Suspense>
    </>
  );
}

/** One labelled row: label column + content, stacked on mobile. */
function Row({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t py-8 md:grid-cols-3 md:gap-gutter md:py-10">
      <h2 id={id} className="text-title">
        {label}
      </h2>
      <div className="md:col-span-2">{children}</div>
    </section>
  );
}

async function DetailsContent() {
  const user = await requireUser("/account/details");

  return (
    <>
      <AccountHeader eyebrow="My account" title="Personal details" intro="The details we use for your account." />

      <Row id="row-name" label="Your name">
        <p className="mb-6 text-body-sm text-muted">How we greet you and address your parcels.</p>
        <NameForm initialName={user.name} />
      </Row>

      <Row id="row-sign-in" label="Signing in">
        <dl className="space-y-5 text-body">
          <div>
            <dt className="text-label font-medium text-muted uppercase">Email</dt>
            <dd className="mt-1 break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-label font-medium text-muted uppercase">Password</dt>
            <dd className="mt-1">
              <span aria-hidden="true">••••••••••</span>
              <span className="sr-only">Set</span>
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-body-sm text-muted">Changing your email or password isn&rsquo;t available online yet.</p>
      </Row>

      <Row id="row-membership" label="Membership">
        <dl className="space-y-5 text-body">
          <div>
            <dt className="text-label font-medium text-muted uppercase">Member since</dt>
            <dd className="mt-1">{formatMemberSince(user.createdAt)}</dd>
          </div>
          {user.role === "admin" && (
            <div>
              <dt className="text-label font-medium text-muted uppercase">Access</dt>
              <dd className="mt-1">Administrator</dd>
            </div>
          )}
        </dl>
      </Row>
    </>
  );
}

function DetailsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your details">
      <div className="mb-8 md:mb-10">
        <div className="mb-2 h-3 w-24 bg-surface" />
        <div className="h-9 w-72 bg-surface" />
        <div className="mt-2 h-4 w-56 bg-surface" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid gap-4 border-t py-8 md:grid-cols-3 md:py-10">
          <div className="h-6 w-32 bg-surface" />
          <div className="h-24 bg-surface md:col-span-2" />
        </div>
      ))}
    </div>
  );
}
