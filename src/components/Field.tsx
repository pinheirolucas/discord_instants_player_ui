import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import "./controls.css";

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
}

export function Field({ label, error, className, ...rest }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = Boolean(error);

  return (
    <div className={["field", className].filter(Boolean).join(" ")} data-invalid={invalid}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        {...rest}
      />
      {invalid && (
        <p className="msg" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
