"use client";

import { useSyncExternalStore } from "react";

/*
 * "Save for later" list, kept in this browser (localStorage) until accounts exist.
 * Stores product slugs, newest first. Syncs across tabs via the `storage` event.
 */

const STORAGE_KEY = "atelier:saved-items";
const CHANGE_EVENT = "atelier:saved-items-change";

let cache: string[] | null = null;

function readStorage(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return []; // storage blocked (private mode, disabled cookies) or corrupt value
  }
}

function getSnapshot(): string[] {
  cache ??= readStorage();
  return cache;
}

/** Unknown on the server and during hydration; components render a neutral state. */
function getServerSnapshot(): null {
  return null;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cache = null; // another tab changed the list
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function write(next: string[]) {
  cache = next; // the in-memory list stays correct even if storage is unavailable
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep working for this session only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Saved product slugs, newest first; `null` until the browser list has been read. */
export function useSavedItems(): string[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Adds or removes a product; returns whether it is now saved. */
export function toggleSaved(slug: string): boolean {
  const current = getSnapshot();
  const isSaved = current.includes(slug);
  write(isSaved ? current.filter((item) => item !== slug) : [slug, ...current]);
  return !isSaved;
}
