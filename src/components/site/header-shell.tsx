"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Scrolled past this (px), the header turns solid. */
const SOLID_AFTER = 8;
/** Below this (px) the header never hides, so it is always there near the top. */
const HIDE_AFTER = 200;
/** Ignore direction changes smaller than this (px) — trackpad/touch jitter. */
const DIRECTION_TOLERANCE = 6;

/**
 * Sticky <header> that reports scroll state as attributes; all styling lives in CSS.
 *   data-scrolled  — page scrolled past SOLID_AFTER (solid instead of transparent)
 *   data-hidden    — scrolling down past HIDE_AFTER (header slides away); scrolling up brings it back
 *   html[data-header-hidden] — lets sticky content (e.g. product info) move up into the freed space
 *   html[data-header-ready]  — JS is running; the overlay variant switches to <HeaderOverlay>'s flag
 */
/** Keyboard focus or an open menu inside the header. */
function isBusy(header: HTMLElement) {
  try {
    return header.matches(":has(:focus-visible), :has(dialog[open])");
  } catch {
    return header.contains(document.activeElement); // no :has() support
  }
}

export function HeaderShell({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    root.setAttribute("data-header-ready", "");

    let lastY = window.scrollY;
    let frame = 0;

    const setHidden = (hidden: boolean) => {
      header.toggleAttribute("data-hidden", hidden);
      root.toggleAttribute("data-header-hidden", hidden);
    };

    const update = () => {
      frame = 0;
      const y = Math.max(window.scrollY, 0);
      header.toggleAttribute("data-scrolled", y > SOLID_AFTER);

      const delta = y - lastY;
      if (Math.abs(delta) < DIRECTION_TOLERANCE) return;
      lastY = y;

      // Keep the header in view near the top, and while someone is working inside it.
      const busy = isBusy(header);
      if (y < HIDE_AFTER || busy) setHidden(false);
      else setHidden(delta > 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // A new page starts with the header visible.
    setHidden(false);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <header ref={ref} className={className}>
      {children}
    </header>
  );
}
