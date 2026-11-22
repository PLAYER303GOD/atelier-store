"use client";

import { useSavedItems } from "@/lib/saved-items";

/** Saved-items count for the account overview. Saved items live in this browser (localStorage). */
export function SavedSummary() {
  const saved = useSavedItems();
  // null until hydrated: keep the line's height, say nothing yet.
  if (saved === null) return <p className="h-6 w-40 bg-surface" aria-hidden="true" />;
  return (
    <p className="text-body">
      {saved.length === 0
        ? "Nothing saved yet."
        : `${saved.length} ${saved.length === 1 ? "piece" : "pieces"} saved on this device.`}
    </p>
  );
}
