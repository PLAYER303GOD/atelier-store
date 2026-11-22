"use client";

import Link from "next/link";

import { UserIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/**
 * Header account link: the user icon, plus the signed-in customer's first name beside it.
 *
 * Client-side on purpose: the header is in every page's static shell, so it must not read
 * the session on the server. Better Auth's `useSession()` fetches it after hydration and
 * updates by itself on sign-in, sign-out and name changes (no refresh needed). It also
 * touches the session endpoint, which keeps the 30-day session sliding while people browse.
 * Until it resolves (or when signed out) this is the plain icon, so nothing shifts for guests.
 */
export function AccountLink() {
  const { data } = authClient.useSession();
  const firstName = data?.user.name.trim().split(/\s+/)[0];

  if (!firstName) {
    return (
      <Link href="/account" className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Account">
        <UserIcon />
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      // Accessible name contains the visible text (WCAG 2.5.3, label in name).
      aria-label={`Hello, ${firstName}. My account`}
      className={buttonStyles({ variant: "ghost", size: "icon-label" })}
    >
      <UserIcon />
      {/* A sentence-case greeting at regular weight, matching the account overview's
          "Hello, …" and the hairline icons (the button's uppercase label style would read as a
          nav item). It fades in place (vt-fade) and never slides: movement inside a 44px row
          looks like the header changing height. -ml-0.5 → 6px from its icon. translate-y-px:
          measured, the capitals' optical centre sits 1.1px above the icon's stroke centre. */}
      <span className="-ml-0.5 max-w-40 translate-y-px animate-[vt-fade_0.5s_var(--ease-standard)_both] truncate text-body-sm font-normal tracking-normal normal-case">
        Hello, {firstName}
      </span>
    </Link>
  );
}
