"use client";

import { useLayoutEffect } from "react";

/**
 * Render inside a full-bleed hero to make the header transparent over it.
 *
 * Next.js keeps previously visited pages in the DOM (hidden via <Activity>), so a CSS
 * check for "a hero exists" would also match a hidden page. Effects, however, are
 * cleaned up when a page is hidden — so this flag is only set while the hero is shown.
 */
export function HeaderOverlay() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-header-overlay", "");
    return () => root.removeAttribute("data-header-overlay");
  }, []);
  return null;
}
