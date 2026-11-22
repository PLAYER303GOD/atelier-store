"use client";

import { type ComponentProps, useState } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { TextField } from "@/components/ui/text-field";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "action" | "notice">;

/**
 * TextField for passwords: a show/hide toggle (a real button with aria-pressed, so it's
 * reachable and announced) and a Caps Lock warning while typing.
 */
export function PasswordField({ onKeyDown, onKeyUp, onBlur, disabled, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const checkCaps = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <TextField
      {...props}
      disabled={disabled}
      type={visible ? "text" : "password"}
      onKeyDown={(event) => {
        checkCaps(event);
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        checkCaps(event);
        onKeyUp?.(event);
      }}
      onBlur={(event) => {
        setCapsLock(false);
        onBlur?.(event);
      }}
      notice={capsLock ? "Caps Lock is on." : undefined}
      action={
        <button
          type="button"
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((value) => !value)}
          className="-mr-3 flex size-11 items-center justify-center text-muted transition-colors hover:text-ink disabled:pointer-events-none [&_svg]:size-5"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}
