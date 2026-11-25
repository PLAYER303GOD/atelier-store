import type { ReactNode } from "react";

/** Admin page heading (same eyebrow / display-sm / intro rhythm as AccountHeader). */
export function AdminHeader({ title, intro, action }: { title: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 md:mb-10">
      <div>
        <p className="mb-2 text-caption text-muted uppercase">Admin</p>
        <h1 className="text-display-sm">{title}</h1>
        {intro && <p className="mt-2 text-body text-muted">{intro}</p>}
      </div>
      {action}
    </header>
  );
}

/** Loading state for an admin section, inside its <Suspense>. */
export function AdminSectionSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <div className="mb-8 md:mb-10">
        <div className="mb-2 h-3 w-16 bg-surface" />
        <div className="h-9 w-56 bg-surface" />
        <div className="mt-2 h-4 w-72 max-w-full bg-surface" />
      </div>
      <div className="border-t">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b py-4">
            <div className="h-4 w-1/3 bg-surface" />
            <div className="h-4 w-1/5 bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder body for a section whose tools arrive in a later step. */
export function AdminComingNext({ children }: { children: ReactNode }) {
  return <p className="border-t py-8 text-body text-muted">{children}</p>;
}
