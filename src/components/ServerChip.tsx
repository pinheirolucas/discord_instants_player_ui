import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import "./controls.css";

export interface ServerChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  address: string;
  healthy: boolean;
}

/** The backend address, visible as text rather than hidden behind an icon
 *  with a badge on it: which bot you are talking to is worth a glance. */
export const ServerChip = forwardRef<HTMLButtonElement, ServerChipProps>(
  function ServerChip({ address, healthy, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className="srv"
        aria-label={healthy ? `Servidor ${address}` : `${address} não está respondendo`}
        {...rest}
      >
        <span className="dot" data-healthy={healthy} />
        {address}
      </button>
    );
  }
);
