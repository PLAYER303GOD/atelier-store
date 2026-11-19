import type { ReactNode } from "react";

import { PlusIcon } from "@/components/icons";

type DisclosureProps = { title: string; defaultOpen?: boolean; children: ReactNode };

/**
 * Hairline accordion row on native <details>: keyboard, screen reader and
 * find-in-page support with no JavaScript. Stack several; each draws its top border,
 * so close the stack with a `border-b` on the parent.
 */
export function Disclosure({ title, defaultOpen = false, children }: DisclosureProps) {
  return (
    <details open={defaultOpen} className="group border-t">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-label font-medium uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <PlusIcon className="size-4 shrink-0 transition-transform group-open:rotate-45" />
      </summary>
      <div className="pb-6 text-body-sm text-muted">{children}</div>
    </details>
  );
}
