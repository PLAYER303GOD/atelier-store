"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

/**
 * Ends the session (the server deletes it and clears the cookie), then returns home.
 * `appearance="link"` renders it as an account-nav item instead of a secondary button.
 */
export function SignOutButton({ appearance = "button" }: { appearance?: "button" | "link" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  const label = pending ? "Signing out…" : "Sign out";

  if (appearance === "link") {
    return (
      <button
        type="button"
        onClick={signOut}
        aria-disabled={pending || undefined}
        className={cn(
          "block -mb-px border-b border-transparent py-3 text-label font-medium whitespace-nowrap uppercase transition-colors duration-200 lg:mb-0 lg:border-0 lg:py-2.5",
          pending ? "text-subtle" : "text-muted hover:text-ink",
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <Button variant="secondary" onClick={signOut} aria-disabled={pending || undefined}>
      {label}
    </Button>
  );
}
