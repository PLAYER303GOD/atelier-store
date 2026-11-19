"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { isCurrent } from "@/components/site/header-nav";
import { Button } from "@/components/ui/button";
import type { NavLink } from "@/lib/site";

type MobileMenuProps = { primary: NavLink[]; secondary: NavLink[] };

/**
 * Left drawer built on <dialog>: focus trapping, Esc and an inert background come from
 * the browser. Slides in/out with CSS (@starting-style + allow-discrete); browsers without
 * that support simply show and hide it instantly.
 */
export function MobileMenu({ primary, secondary }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  const open = () => {
    dialogRef.current?.showModal();
    // A modal dialog doesn't stop the page behind it from scrolling.
    document.documentElement.style.overflow = "hidden";
  };
  const close = () => dialogRef.current?.close();

  // Close after any navigation (links, back/forward) — not only when a link is clicked.
  useEffect(() => {
    close();
  }, [pathname]);

  // Esc, backdrop click and close() all end here.
  useEffect(() => {
    const dialog = dialogRef.current;
    const unlock = () => document.documentElement.style.removeProperty("overflow");
    dialog?.addEventListener("close", unlock);
    return () => {
      dialog?.removeEventListener("close", unlock);
      unlock();
    };
  }, []);

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Open menu" aria-haspopup="dialog" onClick={open}>
        <MenuIcon />
      </Button>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        // Clicks on the backdrop land on the <dialog> element itself.
        onClick={(event) => event.target === dialogRef.current && close()}
        className={[
          "m-0 h-dvh max-h-none w-full max-w-sm bg-paper p-0 text-ink",
          // drawer slide
          "-translate-x-full transition-[translate,overlay,display] transition-discrete duration-500 ease-out-soft",
          "open:translate-x-0 starting:open:-translate-x-full",
          // backdrop fade
          "backdrop:bg-black/0 backdrop:transition-[background-color,overlay,display] backdrop:transition-discrete backdrop:duration-500",
          "open:backdrop:bg-overlay starting:open:backdrop:bg-black/0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center border-b px-gutter">
            <Button variant="ghost" size="icon" aria-label="Close menu" className="-ml-3" onClick={close}>
              <CloseIcon />
            </Button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-gutter py-6">
            <ul className="space-y-1">
              {primary.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                    className="block py-2.5 text-title uppercase transition-colors hover:text-muted aria-[current=page]:underline aria-[current=page]:decoration-1 aria-[current=page]:underline-offset-8"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ul className="shrink-0 space-y-3 border-t px-gutter py-6">
            {secondary.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                  className="text-body-sm text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
