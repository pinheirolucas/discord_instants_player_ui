import type { HTMLAttributes } from "react";
import "./states.css";

export type DropState = "idle" | "over" | "ok" | "bad";

export interface DropZoneProps extends HTMLAttributes<HTMLDivElement> {
  state: DropState;
  title: string;
  hint?: string;
}

const COPY: Record<DropState, { title: string; hint?: string }> = {
  idle: {
    title: "Arraste o arquivo para cá",
    hint: "ou clique para escolher um do computador"
  },
  over: { title: "Solte para carregar" },
  ok: { title: "" },
  bad: { title: "Esse arquivo não serve", hint: "Só arquivos .json são aceitos." }
};

export function DropZone({ state, title, hint, ...rest }: DropZoneProps) {
  const fallback = COPY[state];

  return (
    <div className="drop" data-state={state} {...rest}>
      <b>{title || fallback.title}</b>
      {(hint ?? fallback.hint) && <span>{hint ?? fallback.hint}</span>}
    </div>
  );
}
