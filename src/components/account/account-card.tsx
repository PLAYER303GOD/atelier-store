import type { ReactNode } from "react";

import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/cn";

const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** "November 2026" from the user's ISO createdAt. */
export const formatMemberSince = (iso: string) => monthYear.format(new Date(iso));

type AccountCardProps = {
  id: string;
  title: string;
  children: ReactNode;
  action?: { label: string; href: string };
  className?: string;
};

/** Hairline-bordered panel for the account overview: title, content, one call to action. */
export function AccountCard({ id, title, children, action, className }: AccountCardProps) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col border border-line p-6 md:p-8", className)}>
      <h2 id={id} className="mb-4 text-title">
        {title}
      </h2>
      <div className="flex-1">{children}</div>
      {action && (
        <TextLink href={action.href} variant="cta" className="mt-6 self-start">
          {action.label}
        </TextLink>
      )}
    </section>
  );
}

/** Page heading shared by the account pages (same eyebrow / display-sm / intro rhythm as listings). */
export function AccountHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: ReactNode }) {
  return (
    <header className="mb-8 md:mb-10">
      <p className="mb-2 text-caption text-muted uppercase">{eyebrow}</p>
      <h1 className="text-display-sm">{title}</h1>
      {intro && <p className="mt-2 text-body text-muted">{intro}</p>}
    </header>
  );
}
