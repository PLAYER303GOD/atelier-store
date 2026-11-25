"use client";

import { type FormEvent, useActionState, useEffect, useRef, useState } from "react";

import { DetailsField } from "@/components/admin/details-field";
import { ImageFields } from "@/components/admin/image-fields";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { createProduct, type ProductFormState, updateProduct } from "@/lib/admin-product-actions";
import {
  type ProductFieldErrors,
  type ProductFormValues,
  PRODUCT_LIMITS,
  slugify,
  validateProduct,
} from "@/lib/admin-validation";

type ProductFormProps = {
  mode: "create" | "edit";
  categories: { slug: string; name: string }[];
  initial: ProductFormValues;
  /** Edit only: the version this form was loaded from (sent back for the stale-save check). Read once. */
  updatedAt?: string;
};

/** Field order: submit focuses the first invalid one. */
const FIELD_ORDER = ["name", "slug", "categorySlug", "price", "colour", "description", "details", "badge", "status", "initialStock", "images"];
const IDLE: ProductFormState = { status: "idle" };

/**
 * Create / edit a product. The server action validates everything again and is the authority;
 * this runs the same rules (validateProduct) so errors show after a field is left or on submit
 * and clear as soon as they're fixed. While saving, fields are read-only and the button is
 * aria-disabled (keeps focus). Broken image links block saving.
 */
export function ProductForm({ mode, categories, initial, updatedAt }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(mode === "create" ? createProduct : updateProduct, IDLE);
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [brokenSrcs, setBrokenSrcs] = useState<Set<string>>(new Set());
  const [serverErrors, setServerErrors] = useState<ProductFieldErrors>({});
  const [savedNote, setSavedNote] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // The version this draft is based on. It only moves forward when *this* draft saves: a page
  // refresh (e.g. from the stock adjuster) can bring a newer `updatedAt` prop from someone else's
  // save, and adopting it would let this older draft overwrite their changes unnoticed.
  const [baseline, setBaseline] = useState(updatedAt);

  // A new server result: keep its field errors until those fields change; show "Saved".
  // (Adjusted during render when the result changes, not in an effect.)
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setServerErrors(state.errors ?? {});
    setSavedNote(state.status === "saved");
    if (state.status === "saved" && state.updatedAt) setBaseline(state.updatedAt);
  }
  // A form-level error (no field to point at) takes focus so it's read out.
  useEffect(() => {
    if (state.status === "error" && state.message && !state.errors) alertRef.current?.focus();
  }, [state]);

  const clientErrors: ProductFieldErrors = { ...(validateProduct(values, mode).errors ?? {}) };
  values.images.forEach((image, i) => {
    if (image.src.trim() && brokenSrcs.has(image.src.trim()) && !clientErrors[`images.${i}.src`]) {
      clientErrors[`images.${i}.src`] = "This image couldn't be loaded. Check the address.";
    }
  });
  const errorFor = (key: string) =>
    (submitted || touched.has(key) ? clientErrors[key] : undefined) ?? serverErrors[key];

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slugEdited && mode === "create") next.slug = slugify(String(value));
      return next;
    });
    setSavedNote(false);
    setServerErrors((current) => {
      if (!(key in current) && !(key === "images" && Object.keys(current).some((k) => k.startsWith("images")))) return current;
      const next = { ...current };
      delete next[key];
      if (key === "images") for (const k of Object.keys(next)) if (k.startsWith("images")) delete next[k];
      return next;
    });
  };
  const blur = (key: string) => setTouched((current) => new Set(current).add(key));
  const field = (key: keyof ProductFormValues) => ({
    name: key,
    value: values[key] as string,
    readOnly: pending,
    onBlur: () => blur(key),
    error: errorFor(key),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) return event.preventDefault();
    setSubmitted(true);
    const invalid = Object.keys(clientErrors);
    if (invalid.length === 0) return; // let the form action run
    event.preventDefault();
    const first =
      FIELD_ORDER.find((key) => invalid.includes(key)) ??
      invalid.find((key) => key.startsWith("images.")) ??
      invalid[0];
    const match = /^images\.(\d+)\.(src|alt)$/.exec(first);
    const target = match
      ? formRef.current?.querySelectorAll<HTMLElement>(`[name="image${match[2] === "src" ? "Src" : "Alt"}"]`)[Number(match[1])]
      : first === "details"
        ? formRef.current?.querySelector<HTMLElement>('input[aria-label^="Detail "]') // `details` itself is hidden
        : formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    target?.focus();
  }

  const formError = state.status === "error" && state.message ? state.message : null;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate aria-busy={pending} className="max-w-3xl">
      <div ref={alertRef} tabIndex={-1} role="alert" className="outline-none">
        {formError && (
          <p className="mb-8 animate-rise border-l-2 border-error bg-surface px-4 py-3 text-body-sm text-error [animation-duration:0.35s]">
            {formError}
          </p>
        )}
      </div>
      {mode === "edit" && <input type="hidden" name="updatedAt" value={baseline} />}

      <Section title="Details">
        <TextField label="Name" type="text" autoComplete="off" maxLength={PRODUCT_LIMITS.name} {...field("name")} onChange={(e) => set("name", e.target.value)} />
        {mode === "create" ? (
          <TextField
            label="Web address"
            type="text"
            autoComplete="off"
            maxLength={PRODUCT_LIMITS.slug}
            {...field("slug")}
            onChange={(e) => {
              setSlugEdited(true);
              set("slug", e.target.value);
            }}
            hint={
              <>
                The product page will be <span className="text-ink">/products/{values.slug || "…"}</span>. It can&rsquo;t be
                changed later.
              </>
            }
          />
        ) : (
          <div>
            <p className="text-label font-medium uppercase">Web address</p>
            <p className="mt-2 flex h-12 items-center border-b border-line text-body text-muted">/products/{values.slug}</p>
            <input type="hidden" name="slug" value={values.slug} />
            <p className="mt-2 text-body-sm text-muted">Fixed: orders, saved items and links use it.</p>
          </div>
        )}
        <SelectField label="Category" {...field("categorySlug")} disabled={pending} onChange={(e) => set("categorySlug", e.target.value)}>
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Colour" type="text" autoComplete="off" maxLength={PRODUCT_LIMITS.colour} {...field("colour")} onChange={(e) => set("colour", e.target.value)} />
        <TextArea label="Description" rows={3} maxLength={PRODUCT_LIMITS.description} {...field("description")} onChange={(e) => set("description", e.target.value)} className="md:col-span-2" />
        <div className="md:col-span-2">
          <DetailsField
            value={values.details}
            onChange={(details) => set("details", details)}
            onBlur={() => blur("details")}
            error={errorFor("details")}
            readOnly={pending}
          />
        </div>
        <TextField
          label="Badge (optional)"
          type="text"
          autoComplete="off"
          maxLength={PRODUCT_LIMITS.badge}
          {...field("badge")}
          onChange={(e) => set("badge", e.target.value)}
          hint="A short label on the card, e.g. New."
        />
      </Section>

      <Section title="Price and availability">
        <TextField
          label="Price (USD)"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          {...field("price")}
          onChange={(e) => set("price", e.target.value)}
          hint="For example 1290 or 1290.50."
        />
        {mode === "create" && (
          <TextField
            label="Initial stock"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            {...field("initialStock")}
            onChange={(e) => set("initialStock", e.target.value)}
            hint="Units available to sell. Adjust later from the product page."
          />
        )}
        <fieldset className="md:col-span-2" aria-describedby={errorFor("status") ? "status-error" : undefined}>
          <legend className="text-label font-medium uppercase">Availability</legend>
          <div className="mt-3 space-y-3">
            {(
              [
                ["active", "Available", "Shown in the store and can be bought while in stock."],
                ["hidden", "Hidden", "Not shown anywhere in the store and can't be bought. Existing orders aren't affected."],
              ] as const
            ).map(([value, label, help]) => (
              <label key={value} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="status"
                  value={value}
                  checked={values.status === value}
                  onChange={() => set("status", value)}
                  disabled={pending && values.status !== value}
                  className="mt-1 size-4 accent-ink"
                />
                <span>
                  <span className="block text-body">{label}</span>
                  <span className="block text-body-sm text-muted">{help}</span>
                </span>
              </label>
            ))}
          </div>
          {errorFor("status") && (
            <p id="status-error" className="mt-2 text-body-sm text-error">
              {errorFor("status")}
            </p>
          )}
        </fieldset>
      </Section>

      <Section title="Images" single>
        <ImageFields
          images={values.images}
          onChange={(images) => set("images", images)}
          errorFor={errorFor}
          onBlurField={blur}
          onBroken={(src, broken) =>
            setBrokenSrcs((current) => {
              if (current.has(src) === broken) return current;
              const next = new Set(current);
              if (broken) next.add(src);
              else next.delete(src);
              return next;
            })
          }
          readOnly={pending}
        />
      </Section>

      <div className="mt-10 flex flex-wrap items-center gap-5 border-t pt-8">
        <Button type="submit" aria-disabled={pending || undefined}>
          {pending && (
            <span aria-hidden="true" className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
          )}
          {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </Button>
        <p aria-live="polite" className="text-body-sm text-success">
          {savedNote && <span className="inline-block animate-rise [animation-duration:0.35s]">✓ Saved</span>}
        </p>
      </div>
    </form>
  );
}

function Section({ title, single, children }: { title: string; single?: boolean; children: React.ReactNode }) {
  return (
    <section className="border-t py-8 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="mb-6 text-title">{title}</h2>
      <div className={single ? undefined : "grid gap-x-gutter gap-y-6 md:grid-cols-2"}>{children}</div>
    </section>
  );
}
