import { ViewTransition } from "react";

import { SmoothImage } from "@/components/ui/smooth-image";
import { hero, unsplash } from "@/lib/catalog";
import { services } from "@/lib/site";

type Mode = "sign-in" | "sign-up";

// Photos reused from the catalogue/homepage (already checked at full size for brand marks).
const panels = {
  "sign-in": {
    eyebrow: "The atelier",
    title: "Welcome back",
    body: "Considered layers and softened tailoring, waiting where you left them.",
    image: hero.image,
  },
  "sign-up": {
    eyebrow: "Atelier membership",
    title: "Made to be kept",
    body: "Create an account and every visit begins where the last one ended.",
    image: {
      src: unsplash("1581044777550-4cfa60707c03"),
      alt: "Woman in a pale pink ruffled dress standing in a golden field",
    },
  },
} as const;

/**
 * Editorial half of the sign-in / sign-up split (768px+): full-height photo with the hero's
 * gradient, a short line and the house privileges (`services`, as on the homepage).
 * Both pages render it under one shared view-transition name, so switching between them
 * slowly crossfades one photograph into the other (`.auth-visual` in globals.css) while
 * the form column slides. The copy has its own name (`.auth-copy`) so the old text leaves
 * before the new text rises, instead of two headings ghosting over each other.
 * From 768px the panel shows the line; from 1024px the privileges too.
 */
export function AuthVisual({ mode }: { mode: Mode }) {
  const panel = panels[mode];
  return (
    <ViewTransition name="auth-visual" share="auth-visual" default="none">
      <aside aria-labelledby="auth-visual-title" className="relative hidden min-h-[36rem] overflow-hidden bg-surface text-paper md:block">
        <SmoothImage
          src={panel.image.src}
          alt=""
          fill
          preload
          sizes="50vw"
          className="animate-hero-zoom object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/5" />

        <ViewTransition name="auth-copy" share={{ "auth-switch": "auth-copy", default: "none" }} default="none">
          <div className="absolute inset-x-0 bottom-0 p-8 lg:p-12 xl:p-16">
            <p className="mb-3 animate-rise text-caption uppercase" style={{ animationDelay: "150ms" }}>
              {panel.eyebrow}
            </p>
            <h2 id="auth-visual-title" className="max-w-xl animate-rise text-display text-balance" style={{ animationDelay: "250ms" }}>
              {panel.title}
            </h2>
            <p className="mt-4 max-w-sm animate-rise text-body-lg text-paper/85" style={{ animationDelay: "350ms" }}>
              {panel.body}
            </p>

            <ul
              role="list"
              aria-label="Privileges"
              className="mt-10 hidden max-w-xl animate-rise grid-cols-2 gap-x-8 gap-y-6 border-t border-paper/25 pt-8 lg:grid"
              style={{ animationDelay: "450ms" }}
            >
              {services.map((service) => (
                <li key={service.title}>
                  <p className="text-label font-medium uppercase">{service.title}</p>
                  <p className="mt-1 text-body-sm text-paper/70">{service.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </ViewTransition>
      </aside>
    </ViewTransition>
  );
}
