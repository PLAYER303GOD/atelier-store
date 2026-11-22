"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

type Mode = "sign-in" | "sign-up";
type Field = "name" | "email" | "password";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

/** Mirrors the server (src/lib/auth.ts): the server stays the authority, this is for speed. */
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const NAME_MAX = 100;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const copy = {
  "sign-in": {
    submit: "Sign in",
    pending: "Signing in…",
    success: "Signed in. Taking you back…",
    switchText: "New to Atelier?",
    switchLabel: "Create an account",
  },
  "sign-up": {
    submit: "Create account",
    pending: "Creating your account…",
    success: "Account created. Taking you in…",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
  },
} as const;

function validate(mode: Mode, values: Values): Errors {
  const errors: Errors = {};
  if (mode === "sign-up") {
    if (!values.name.trim()) errors.name = "Enter your name.";
    else if (values.name.trim().length > NAME_MAX) errors.name = `Use ${NAME_MAX} characters or fewer.`;
  }
  const email = values.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL.test(email)) errors.email = "Enter an email address like name@example.com.";

  if (!values.password) errors.password = "Enter your password.";
  else if (mode === "sign-up" && values.password.length < PASSWORD_MIN)
    errors.password = `Use at least ${PASSWORD_MIN} characters (${PASSWORD_MIN - values.password.length} more).`;
  else if (values.password.length > PASSWORD_MAX) errors.password = `Use ${PASSWORD_MAX} characters or fewer.`;
  return errors;
}

type FormError = { message: string; action?: { label: string; href: string } };

/**
 * Email + password sign-in / sign-up with client-side validation (noValidate: our messages,
 * not the browser's), a locked form while the request runs, and server errors placed where
 * they belong — on a field when they're about it, otherwise in an alert above the form.
 * On success Better Auth sets the session cookie; we go to `next` (sanitised on the server).
 */
export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const text = copy[mode];
  const fields: Field[] = mode === "sign-up" ? ["name", "email", "password"] : ["email", "password"];

  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  // A field shows its error once the user has left it, or after a submit attempt.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "success">("idle");

  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  const alertRef = useRef<HTMLDivElement>(null);

  const clientErrors = validate(mode, values);
  const errorFor = (field: Field) => serverErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);
  const busy = status !== "idle";

  const switchHref = `/${mode === "sign-in" ? "sign-up" : "sign-in"}?${new URLSearchParams({ next })}`;

  const update = (field: Field) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    // Editing a field answers its server error (e.g. "account exists").
    if (serverErrors[field]) {
      setServerErrors((current) => {
        const rest = { ...current };
        delete rest[field];
        return rest;
      });
    }
  };
  const blur = (field: Field) => () => setTouched((current) => ({ ...current, [field]: true }));

  function fail(error: FormError, focusField?: Field) {
    setStatus("idle");
    setFormError(error);
    // Move focus so keyboard and screen-reader users land on what needs attention.
    requestAnimationFrame(() => (focusField ? inputs.current[focusField]?.focus() : alertRef.current?.focus()));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setTouched(Object.fromEntries(fields.map((field) => [field, true])));
    setFormError(null);
    setServerErrors({});
    const firstInvalid = fields.find((field) => clientErrors[field]);
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus();
      return;
    }

    setStatus("pending");
    const email = values.email.trim();
    let result: Awaited<ReturnType<typeof authClient.signIn.email>>;
    try {
      result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password: values.password, rememberMe: true })
          : await authClient.signUp.email({ name: values.name.trim(), email, password: values.password });
    } catch {
      return fail({ message: "We couldn't reach Atelier. Check your connection and try again." });
    }

    const { error } = result;
    if (!error) {
      setStatus("success");
      router.replace(next);
      router.refresh();
      return; // stay locked until the navigation replaces this page
    }

    switch (error.code) {
      case "INVALID_EMAIL_OR_PASSWORD":
        setValues((current) => ({ ...current, password: "" }));
        setTouched((current) => ({ ...current, password: false }));
        return fail({ message: "That email and password don't match. Check them and try again." }, "password");
      case "USER_ALREADY_EXISTS":
      case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
        setServerErrors({ email: "An account with this email already exists." });
        return fail(
          { message: "You already have an account with this email.", action: { label: "Sign in instead", href: switchHref } },
          "email",
        );
      case "INVALID_EMAIL":
        setServerErrors({ email: "Enter an email address like name@example.com." });
        return fail({ message: "Check the highlighted field." }, "email");
      case "PASSWORD_TOO_SHORT":
      case "PASSWORD_TOO_LONG":
        setServerErrors({ password: `Use ${PASSWORD_MIN}–${PASSWORD_MAX} characters.` });
        return fail({ message: "Check the highlighted field." }, "password");
    }
    if (error.status === 429) {
      return fail({ message: "Too many attempts. Wait a minute, then try again." });
    }
    // Anything else is on our side (misconfiguration, server error): don't blame the user.
    return fail({ message: "Something went wrong on our side. Please try again in a moment." });
  }

  const passwordLength = values.password.length;
  const passwordHint: ReactNode =
    mode === "sign-up" ? (
      <p className={cn("transition-colors", passwordLength >= PASSWORD_MIN && "text-success")}>
        {passwordLength >= PASSWORD_MIN ? "✓ " : ""}At least {PASSWORD_MIN} characters
        {passwordLength > 0 && passwordLength < PASSWORD_MIN ? ` (${PASSWORD_MIN - passwordLength} more)` : ""}.
      </p>
    ) : undefined;

  const errorCount = fields.filter((field) => errorFor(field)).length;

  return (
    <>
      <form onSubmit={onSubmit} noValidate aria-busy={status === "pending"} className="space-y-6">
        {/* Server / request errors. Focusable so focus can move here; announced when it appears. */}
        <div ref={alertRef} tabIndex={-1} role="alert" className="outline-none">
          {formError && (
            <div className="animate-rise border-l-2 border-error bg-surface px-4 py-3 text-body-sm [animation-duration:0.35s]">
              <p className="text-error">{formError.message}</p>
              {formError.action && (
                <Link
                  href={formError.action.href}
                  prefetch
                  transitionTypes={["auth-switch"]}
                  className="mt-1 inline-block text-ink underline underline-offset-4"
                >
                  {formError.action.label}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Locked while the request runs: fields go read-only and the button aria-disabled
            (not `disabled`, which would drop keyboard focus to <body>). onSubmit ignores re-submits. */}
        <fieldset className="min-w-0 space-y-6">
          {mode === "sign-up" && (
            <TextField
              ref={(el) => {
                inputs.current.name = el;
              }}
              label="Name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={NAME_MAX}
              value={values.name}
              onChange={update("name")}
              onBlur={blur("name")}
              error={errorFor("name")}
              aria-required="true"
              readOnly={busy}
            />
          )}
          <TextField
            ref={(el) => {
              inputs.current.email = el;
            }}
            label="Email"
            name="email"
            type="email"
            autoComplete={mode === "sign-in" ? "username" : "email"}
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={values.email}
            onChange={update("email")}
            onBlur={blur("email")}
            error={errorFor("email")}
            aria-required="true"
            readOnly={busy}
          />
          <PasswordField
            ref={(el) => {
              inputs.current.password = el;
            }}
            label="Password"
            name="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            maxLength={PASSWORD_MAX}
            value={values.password}
            onChange={update("password")}
            onBlur={blur("password")}
            error={errorFor("password")}
            // The error already carries the count, so the hint steps aside while it shows.
            hint={errorFor("password") ? undefined : passwordHint}
            aria-required="true"
            readOnly={busy}
          />

          <Button type="submit" fullWidth aria-disabled={busy || undefined}>
            {busy && (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border border-current border-t-transparent"
              />
            )}
            {status === "pending" ? text.pending : status === "success" ? text.success : text.submit}
          </Button>
        </fieldset>

        {/* Polite progress for screen readers; field errors are announced via aria-describedby on focus. */}
        <p aria-live="polite" className="sr-only">
          {status === "pending" ? text.pending : status === "success" ? text.success : ""}
          {status === "idle" && errorCount > 0 && touched.email
            ? `${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} attention.`
            : ""}
        </p>
      </form>

      <p className="mt-8 border-t pt-6 text-body-sm text-muted">
        {text.switchText}{" "}
        {/* "auth-switch" plays the column slide + photo crossfade; prefetch resolves the other form ahead. */}
        <Link
          href={switchHref}
          prefetch
          transitionTypes={["auth-switch"]}
          className="text-ink underline underline-offset-4 hover:decoration-transparent"
        >
          {text.switchLabel}
        </Link>
      </p>
    </>
  );
}
