"use client";

import { createContext, type ReactNode, use, useEffect, useRef, useState, useTransition } from "react";

import { CloseIcon } from "@/components/icons";
import { addToBag } from "@/lib/cart-actions";

type Removed = { slug: string; name: string; quantity: number };
type Notice = { kind: "removed"; item: Removed } | { kind: "restored" | "error"; text: string };

const BagFeedbackContext = createContext<((item: Removed) => void) | null>(null);

/** Lines call this after a successful remove. */
export function useBagRemoved() {
  const notify = use(BagFeedbackContext);
  if (!notify) throw new Error("useBagRemoved must be used inside <BagFeedback>");
  return notify;
}

/**
 * Wraps the bag (list *and* empty state, so it survives the last line going). After a remove,
 * the removed line's controls are gone; focus moves here instead of falling to <body>, the
 * notice is announced, and Undo puts the same quantity back (still clamped to stock by the
 * server). No timer dismisses it: it stays until closed or replaced.
 */
export function BagFeedback({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notice) ref.current?.focus();
  }, [notice]);

  const undo = (item: Removed) => {
    if (pending) return;
    startTransition(async () => {
      const result = await addToBag(item.slug, item.quantity);
      setNotice(
        !result.ok
          ? { kind: "error", text: `${item.name} couldn't be put back: ${result.error}` }
          : { kind: "restored", text: result.limited ? `${item.name} is back in your bag (only ${result.quantity} available).` : `${item.name} is back in your bag.` },
      );
    });
  };

  return (
    <BagFeedbackContext value={(item) => setNotice({ kind: "removed", item })}>
      <div
        ref={ref}
        tabIndex={-1}
        role="status"
        aria-busy={pending}
        className="outline-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {notice && (
          <div
            key={notice.kind === "removed" ? `removed-${notice.item.slug}` : notice.text}
            className={`mb-6 flex animate-[vt-fade_0.35s_var(--ease-standard)_both] items-center justify-between gap-4 border-l-2 bg-surface py-3 pr-2 pl-4 text-body-sm ${notice.kind === "error" ? "border-error text-error" : "border-ink"}`}
          >
            <p>
              {notice.kind === "removed" ? (
                <>
                  {notice.item.name} was removed from your bag.{" "}
                  <button
                    type="button"
                    onClick={() => undo(notice.item)}
                    aria-disabled={pending || undefined}
                    className="font-medium underline underline-offset-4 hover:decoration-transparent aria-disabled:pointer-events-none aria-disabled:text-subtle"
                  >
                    {pending ? "Putting it back…" : "Undo"}
                  </button>
                </>
              ) : (
                notice.text
              )}
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
              className="flex size-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink [&_svg]:size-4"
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </div>
      {children}
    </BagFeedbackContext>
  );
}
