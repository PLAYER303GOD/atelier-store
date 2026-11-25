"use client";

import { type FormEvent, useActionState, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  type CategoryActionResult,
  type CategoryFormState,
  createCategory,
  deleteCategory,
  renameCategory,
} from "@/lib/admin-category-actions";
import type { AdminCategoryRow } from "@/lib/admin";
import { CATEGORY_LIMITS, slugify, validateCategory } from "@/lib/admin-validation";

const IDLE: CategoryFormState = { status: "idle" };
const actionClass =
  "text-label font-medium whitespace-nowrap uppercase underline underline-offset-4 hover:decoration-transparent aria-disabled:pointer-events-none aria-disabled:text-subtle";

/** "Add a category": name + web address (follows the name until edited; fixed once created). */
export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, IDLE);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [seen, setSeen] = useState(state);
  const [serverErrors, setServerErrors] = useState<CategoryFormState["errors"]>({});
  const formRef = useRef<HTMLFormElement>(null);

  // New server result (adjusted during render): clear the form after a save, keep field errors.
  if (seen !== state) {
    setSeen(state);
    setServerErrors(state.errors ?? {});
    if (state.status === "saved") {
      setName("");
      setSlug("");
      setSlugEdited(false);
      setTouched(new Set());
      setSubmitted(false);
    }
  }

  const clientErrors = validateCategory({ name, slug }).errors ?? {};
  const errorFor = (key: "name" | "slug") =>
    (submitted || touched.has(key) ? clientErrors[key] : undefined) ?? serverErrors?.[key];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) return event.preventDefault();
    setSubmitted(true);
    const first = (["name", "slug"] as const).find((key) => clientErrors[key]);
    if (!first) return;
    event.preventDefault();
    formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate aria-busy={pending} className="max-w-3xl">
      <div role="alert">
        {state.status === "error" && state.message && (
          <p className="mb-6 border-l-2 border-error bg-surface px-4 py-3 text-body-sm text-error">{state.message}</p>
        )}
      </div>
      <div className="grid gap-x-gutter gap-y-6 md:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          type="text"
          autoComplete="off"
          maxLength={CATEGORY_LIMITS.name}
          value={name}
          readOnly={pending}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugEdited) setSlug(slugify(event.target.value).slice(0, CATEGORY_LIMITS.slug));
            setServerErrors({});
          }}
          onBlur={() => setTouched((t) => new Set(t).add("name"))}
          error={errorFor("name")}
        />
        <TextField
          label="Web address"
          name="slug"
          type="text"
          autoComplete="off"
          maxLength={CATEGORY_LIMITS.slug}
          value={slug}
          readOnly={pending}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value);
            setServerErrors({});
          }}
          onBlur={() => setTouched((t) => new Set(t).add("slug"))}
          error={errorFor("slug")}
          hint={
            <>
              The category page will be <span className="text-ink">/{slug || "…"}</span>. It can&rsquo;t be changed later.
            </>
          }
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <Button type="submit" size="sm" aria-disabled={pending || undefined}>
          {pending && (
            <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border border-current border-t-transparent" />
          )}
          {pending ? "Adding…" : "Add category"}
        </Button>
        <p aria-live="polite" className="text-body-sm text-success">
          {state.status === "saved" && seen === state && <span className="inline-block animate-rise [animation-duration:0.35s]">✓ {state.message}</span>}
        </p>
      </div>
    </form>
  );
}

/**
 * One category row's actions: Rename (inline field) and Delete (asks to confirm; disabled with a
 * reason while products use the category). The server re-checks both.
 */
export function CategoryRowActions({ category }: { category: AdminCategoryRow }) {
  const [mode, setMode] = useState<"idle" | "rename" | "confirm-delete">("idle");
  const [name, setName] = useState(category.name);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CategoryActionResult | null>(null);
  const inUse = category.products > 0;

  const run = (action: () => Promise<CategoryActionResult>, onOk?: () => void) => {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) {
        setMode("idle");
        onOk?.();
      }
    });
  };
  const error = result && !result.ok ? result.error : undefined;

  if (mode === "rename") {
    return (
      <form
        noValidate
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          run(() => renameCategory(category.slug, name));
        }}
        className="flex flex-wrap items-end gap-4"
      >
        <TextField
          label={`New name for ${category.name}`}
          name="name"
          type="text"
          autoComplete="off"
          autoFocus
          maxLength={CATEGORY_LIMITS.name}
          value={name}
          readOnly={pending}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setMode("idle")}
          error={error}
          className="min-w-48 flex-1"
        />
        <div className="flex items-center gap-4 pb-3">
          <button type="submit" aria-disabled={pending || undefined} className={actionClass}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => { setMode("idle"); setName(category.name); setResult(null); }} className={actionClass}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
      {mode === "confirm-delete" ? (
        <>
          <span className="text-body-sm">Delete {category.name}?</span>
          <button
            type="button"
            autoFocus
            aria-disabled={pending || undefined}
            onClick={() => run(() => deleteCategory(category.slug))}
            className={`${actionClass} text-error`}
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button type="button" onClick={() => setMode("idle")} className={actionClass}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => { setMode("rename"); setResult(null); }} className={actionClass}>
            Rename<span className="sr-only"> {category.name}</span>
          </button>
          <button
            type="button"
            // aria-disabled keeps it focusable but doesn't stop Enter, so guard the click too.
            onClick={() => {
              if (inUse) return;
              setMode("confirm-delete");
              setResult(null);
            }}
            aria-disabled={inUse || undefined}
            title={inUse ? "Move or hide its products first" : undefined}
            className={actionClass}
          >
            Delete<span className="sr-only"> {category.name}</span>
          </button>
        </>
      )}
      <p aria-live="polite" className="w-full text-right text-body-sm text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}
