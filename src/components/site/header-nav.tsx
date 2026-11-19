"use client";

import { usePathname } from "next/navigation";

import { TextLink } from "@/components/ui/text-link";
import type { NavLink } from "@/lib/site";

/** True when `href` is the current page or a section containing it. */
export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop category row; marks the current section with aria-current. */
export function HeaderNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="container-page flex h-11 items-start justify-center gap-10">
        {links.map((link) => (
          <li key={link.href}>
            <TextLink
              href={link.href}
              variant="nav"
              aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </TextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
