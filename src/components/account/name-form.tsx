"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";

const NAME_MAX = 100;

const validate = (name: string) =>
  !name.trim() ? "Enter your name." : name.trim().length > NAME_MAX ? `Use ${NAME_MAX} characters or fewer.` : undefined;

/**
 * Edit the display name through Better Auth's update-user endpoint (it checks the session
 * itself; `role` is input: false, so it can't be changed this way). Same validation rhythm
 * as the sign-in forms: errors after blur or submit, read-only while saving, a polite
 * "Saved" confirmation, server errors in an alert.
 */
export function NameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const error = touched ? validate(name) : undefined;
  const unchanged = name.trim() === initialName;
  const saving = status === "saving";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setTouched(true);
    setServerError(null);
    if (validate(name)) return input.current?.focus();
    if (unchanged) return setStatus("saved");

    setStatus("saving");
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) throw new Error(error.message);
    } catch {
      setStatus("idle");
      setServerError("We couldn't save your name. Please try again.");
      return;
    }
    setName(name.trim());
    setStatus("saved");
    router.refresh(); // re-render server components (greeting, details) with the new name
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={saving} className="max-w-md">
      <div role="alert">
        {serverError && (
          <p className="mb-5 animate-rise border-l-2 border-error bg-surface px-4 py-3 text-body-sm text-error [animation-duration:0.35s]">
            {serverError}
          </p>
        )}
      </div>
      <TextField
        ref={input}
        label="Name"
        name="name"
        type="text"
        autoComplete="name"
        maxLength={NAME_MAX}
        value={name}
        readOnly={saving}
        aria-required="true"
        onChange={(event) => {
          setName(event.target.value);
          if (status === "saved") setStatus("idle");
        }}
        onBlur={() => setTouched(true)}
        error={error}
      />
      <div className="mt-6 flex items-center gap-5">
        <Button type="submit" variant="secondary" size="sm" aria-disabled={saving || undefined}>
          {saving && (
            <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border border-current border-t-transparent" />
          )}
          {saving ? "Saving…" : "Save name"}
        </Button>
        {/* Polite confirmation; also what screen readers hear. */}
        <p aria-live="polite" className="text-body-sm text-success">
          {status === "saved" && <span className="inline-block animate-rise [animation-duration:0.35s]">✓ Saved</span>}
        </p>
      </div>
    </form>
  );
}
