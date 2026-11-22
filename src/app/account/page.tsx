import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AccountCard, AccountHeader, formatMemberSince } from "@/components/account/account-card";
import { SavedSummary } from "@/components/account/saved-summary";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TextLink } from "@/components/ui/text-link";
import { services } from "@/lib/site";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My account — Atelier Store", robots: { index: false } };

/**
 * Account overview. requireUser() (fresh session read) runs inside <Suspense>; the skeleton
 * leaves and the content arrives with the site's slide-down / slide-up pair.
 */
export default function AccountOverviewPage() {
  return (
    <>
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "My account" }]} />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <OverviewSkeleton />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <OverviewContent />
        </ViewTransition>
      </Suspense>
    </>
  );
}

async function OverviewContent() {
  const user = await requireUser("/account");
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <>
      <AccountHeader
        eyebrow="My account"
        title={`Hello, ${firstName}`}
        intro={`Member since ${formatMemberSince(user.createdAt)}.`}
      />

      <div className="grid gap-px border border-line bg-line md:grid-cols-2">
        <AccountCard
          id="card-details"
          title="Personal details"
          action={{ label: "View details", href: "/account/details" }}
          className="border-0 bg-paper"
        >
          <dl className="space-y-3 text-body">
            <div>
              <dt className="sr-only">Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd className="break-all text-muted">{user.email}</dd>
            </div>
          </dl>
        </AccountCard>

        <AccountCard
          id="card-saved"
          title="Saved items"
          action={{ label: "View saved items", href: "/saved" }}
          className="border-0 bg-paper"
        >
          <SavedSummary />
          <p className="mt-2 text-body-sm text-muted">Tap the heart on any piece to keep it here.</p>
        </AccountCard>

        <AccountCard id="card-privileges" title="Your privileges" className="border-0 bg-paper md:col-span-2">
          <ul role="list" className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {services.map((service) => (
              <li key={service.title}>
                <p className="text-label font-medium uppercase">{service.title}</p>
                <p className="mt-1 text-body-sm text-muted">{service.body}</p>
              </li>
            ))}
          </ul>
        </AccountCard>
      </div>

      <section aria-labelledby="discover-title" className="mt-section">
        <h2 id="discover-title" className="mb-5 text-title">
          Continue shopping
        </h2>
        <ul role="list" className="flex flex-wrap gap-x-8 gap-y-4">
          <li>
            <TextLink href="/new-in" variant="cta">
              New arrivals
            </TextLink>
          </li>
          <li>
            <TextLink href="/collections/autumn-winter" variant="cta">
              Autumn–Winter 2026
            </TextLink>
          </li>
          <li>
            <TextLink href="/journal" variant="cta">
              The journal
            </TextLink>
          </li>
          {user.role === "admin" && (
            <li>
              <TextLink href="/admin" variant="cta">
                Admin overview
              </TextLink>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your account">
      <div className="mb-8 md:mb-10">
        <div className="mb-2 h-3 w-24 bg-surface" />
        <div className="h-9 w-64 bg-surface" />
        <div className="mt-2 h-4 w-48 bg-surface" />
      </div>
      <div className="grid gap-px border border-line bg-line md:grid-cols-2">
        <div className="h-48 bg-paper" />
        <div className="h-48 bg-paper" />
        <div className="h-40 bg-paper md:col-span-2" />
      </div>
    </div>
  );
}
