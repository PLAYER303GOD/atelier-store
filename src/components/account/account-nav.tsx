"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/account/sign-out-button";
import { cn } from "@/lib/cn";

const links = [
  { label: "Overview", href: "/account", exact: true },
  { label: "Personal details", href: "/account/details", exact: false },
  { label: "Saved items", href: "/saved", exact: false },
];

/**
 * Account section navigation. Static (no session data), so it lives in the account layout's
 * prerendered shell. Mobile: a swipeable row of tabs under a hairline. From 1024px: a sticky
 * vertical list whose current item carries a 1px ink rule. Sign out sits at the end.
 */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account"
      className="transition-[top] duration-500 ease-out-soft lg:sticky lg:top-[calc(var(--header-offset)+2rem)]"
    >
      <p className="mb-4 hidden text-caption text-muted uppercase lg:block">My account</p>
      <ul
        role="list"
        className="no-scrollbar -mx-gutter flex gap-6 overflow-x-auto border-b px-gutter lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-l lg:px-0"
      >
        {links.map((link) => {
          const current = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "block py-3 text-label font-medium whitespace-nowrap uppercase transition-colors duration-200",
                  // Mobile: underline tab. Desktop: rule on the left edge (overlaps the list's hairline).
                  "-mb-px border-b lg:mb-0 lg:-ml-px lg:border-b-0 lg:border-l lg:py-2.5 lg:pl-5",
                  current ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:mt-6 lg:border-t lg:pt-4 lg:pl-5">
          <SignOutButton appearance="link" />
        </li>
      </ul>
    </nav>
  );
}
