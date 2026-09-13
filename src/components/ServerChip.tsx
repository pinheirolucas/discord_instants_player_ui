import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import "./controls.css";

export interface ServerChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  address: string;
  healthy: boolean;
}

/**
 * The backend address, visible as text rather than hidden behind an icon
 * with a badge: which bot you are talking to is worth a glance.
 *
 * Healthy, the visible address is the whole accessible name, so voice
 * control users can say what they see. Silent, it gets an explicit
 * aria-label that still starts with that address (WCAG label-in-name).
 * Not screen-reader-only text appended as a second node: the name
 * algorithm drops the whitespace between nodes, and the chip announced
 * "localhost:9001não está respondendo".
 */
export const ServerChip = forwardRef<HTMLButtonElement, ServerChipProps>(
  function ServerChip({ address, healthy, ...rest }, ref) {
    const { t } = useTranslation();

    return (
      <button
        ref={ref}
        type="button"
        className="srv"
        title={t("server.switchTitle")}
        aria-label={healthy ? undefined : t("server.unresponsive", { address })}
        {...rest}
      >
        <span className="dot" data-healthy={healthy} aria-hidden="true" />
        {address}
      </button>
    );
  }
);
