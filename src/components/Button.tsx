import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./controls.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  const classes = ["btn", variant === "primary" ? "" : `btn--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: this button has no text, so without it there is no accessible
   *  name at all. MUI used to hide the label on a wrapper span, which is why
   *  the old tests could never use getByRole("button", { name }). */
  label: string;
  children: ReactNode;
}

export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={["ibtn", className].filter(Boolean).join(" ")}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}
