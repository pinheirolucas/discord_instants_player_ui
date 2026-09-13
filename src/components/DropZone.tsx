import type { HTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import "./states.css";

export type DropState = "idle" | "over" | "ok" | "bad";

export interface DropZoneProps extends HTMLAttributes<HTMLDivElement> {
  state: DropState;
  title: string;
  hint?: string;
}

export function DropZone({ state, title, hint, ...rest }: DropZoneProps) {
  const { t } = useTranslation();
  const copy: Record<DropState, { title: string; hint?: string }> = {
    idle: { title: t("dropzone.idleTitle"), hint: t("dropzone.idleHint") },
    over: { title: t("dropzone.overTitle") },
    ok: { title: "" },
    bad: { title: t("dropzone.badTitle"), hint: t("dropzone.badHint") }
  };
  const fallback = copy[state];

  return (
    <div className="drop" data-state={state} {...rest}>
      <b>{title || fallback.title}</b>
      {(hint ?? fallback.hint) && <span>{hint ?? fallback.hint}</span>}
    </div>
  );
}
