"use client";

import Form from "next/form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatPrice, MAX_SEARCH_LENGTH, normalizeSearchQuery } from "@/lib/catalog";
import type { SearchSuggestion } from "@/app/api/search/suggestions/route";

/** Wait this long after the last keystroke before asking for suggestions. */
const DEBOUNCE_MS = 150;

/**
 * Search box with typeahead, following the ARIA combobox pattern: focus stays in the input,
 * ↑/↓ move through the options (aria-activedescendant), Enter opens the highlighted product
 * or, with nothing highlighted, submits to /search. Esc or clicking away closes the list.
 * next/form makes the submit a client-side navigation and keeps the form working before
 * hydration. Remount it (key) when the query in the URL changes.
 */
export function SearchForm({ query = "" }: { query?: string }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const formRef = useRef<HTMLFormElement>(null);

  const [value, setValue] = useState(query);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  // The query the current suggestions answer, so stale results never show for new text.
  const [answered, setAnswered] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const typed = normalizeSearchQuery(value);
  // Options: one per product, then "See all results" when there is anything to search.
  const fresh = answered === typed ? suggestions : [];
  const optionCount = fresh.length + (typed ? 1 : 0);
  const expanded = open && typed.length >= 2 && answered === typed;

  useEffect(() => {
    if (typed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggestions?${new URLSearchParams({ q: typed })}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : []))
        .then((results: SearchSuggestion[]) => {
          setSuggestions(results);
          setAnswered(typed);
          setActive(-1);
        })
        .catch((error) => {
          if (error.name !== "AbortError") console.error(error);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typed]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const choose = (index: number) => {
    close();
    if (index < fresh.length) router.push(`/products/${fresh[index].slug}`);
    else formRef.current?.requestSubmit();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!expanded) {
        setOpen(true);
        return;
      }
      event.preventDefault(); // keep the caret where it is
      const step = event.key === "ArrowDown" ? 1 : -1;
      // -1 (back in the input) is part of the cycle.
      setActive((current) => ((current + 1 + step + optionCount + 1) % (optionCount + 1)) - 1);
    } else if (event.key === "Enter" && expanded && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault(); // don't also clear the field
      close();
    }
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <Form
        ref={formRef}
        action="/search"
        role="search"
        className="flex items-center border-b border-ink"
        onSubmit={close}
      >
        <label htmlFor={`${id}-input`} className="sr-only">
          Search products
        </label>
        <input
          id={`${id}-input`}
          name="q"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={expanded}
          aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          maxLength={MAX_SEARCH_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Search coats, knitwear, colours…"
          // Arriving from the header icon with nothing searched yet: ready to type.
          autoFocus={!query}
          className="h-14 min-w-0 flex-1 bg-transparent text-title outline-none placeholder:text-subtle md:h-16 md:text-display-sm [&::-webkit-search-cancel-button]:hidden"
        />
        <Button type="submit" variant="ghost" size="icon" aria-label="Submit search" className="-mr-3">
          <SearchIcon />
        </Button>
      </Form>

      {/* Polite count for screen readers; the list itself isn't announced while typing. */}
      <p aria-live="polite" className="sr-only">
        {expanded ? `${fresh.length} ${fresh.length === 1 ? "suggestion" : "suggestions"}` : ""}
      </p>

      <ul
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-30 max-h-[min(70vh,32rem)] overflow-y-auto border border-t-0 border-line bg-paper py-2 shadow-[0_12px_24px_-12px_rgb(0_0_0/0.15)]"
      >
        {fresh.map((suggestion, index) => (
          <li
            key={suggestion.slug}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={active === index}
            // Keep focus in the input so the click lands before blur closes the list.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(index)}
            className={cn(
              "flex cursor-pointer items-center gap-4 px-4 py-2 md:px-5",
              active === index && "bg-surface",
            )}
          >
            <span className="relative size-14 shrink-0 overflow-hidden bg-surface">
              <Image src={suggestion.image.src} alt="" fill sizes="56px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-caption text-muted uppercase">{suggestion.category}</span>
              <span className="block truncate text-body-sm">{suggestion.name}</span>
            </span>
            <span className="shrink-0 text-body-sm tabular-nums">{formatPrice(suggestion.priceCents)}</span>
          </li>
        ))}
        {fresh.length === 0 && (
          <li role="presentation" className="px-4 py-3 text-body-sm text-muted md:px-5">
            No pieces match “{typed}” yet.
          </li>
        )}
        <li
          id={`${id}-option-${fresh.length}`}
          role="option"
          aria-selected={active === fresh.length}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActive(fresh.length)}
          onClick={() => choose(fresh.length)}
          className={cn(
            "mt-1 flex cursor-pointer items-center justify-between gap-4 border-t border-line px-4 pt-3 pb-2 text-label font-medium uppercase md:px-5",
            active === fresh.length && "bg-surface",
          )}
        >
          <span className="truncate">See all results for “{typed}”</span>
          <span aria-hidden="true">→</span>
        </li>
      </ul>
    </div>
  );
}
