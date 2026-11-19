import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  /** Right-aligned action, typically a "View all" TextLink. */
  action?: ReactNode;
  className?: string;
};

/** Eyebrow + heading row that opens a content section. */
export function SectionHeader({ id, eyebrow, title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("reveal mb-6 flex items-end justify-between gap-6 md:mb-10", className)}>
      <div>
        {eyebrow && <p className="mb-2 text-caption text-muted uppercase">{eyebrow}</p>}
        <h2 id={id} className="text-display-sm">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}
