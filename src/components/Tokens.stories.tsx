import type { Meta, StoryObj } from "@storybook/react-vite";
import { SLOT_COUNT } from "../lib/slot";

const meta: Meta = { title: "Design system/Tokens" };
export default meta;

const CHROME = ["bg", "panel", "line", "fg", "muted", "accent", "onAccent", "ok"];

/** Every chrome token and palette slot for whatever Tema and Modo the
 *  toolbar has selected. Components never name a colour — they name one
 *  of these. */
export const Palette: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gap: 26 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
        {CHROME.map((token) => (
          <div key={token}>
            <div style={{ height: 56, borderRadius: 8, background: `var(--${token})`, border: "1px solid var(--line)" }} />
            <code style={{ fontSize: 11, color: "var(--muted)" }}>--{token}</code>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${SLOT_COUNT}, 1fr)`, gap: 10 }}>
        {Array.from({ length: SLOT_COUNT }, (_, i) => (
          <div key={i} className={`p${i}`}>
            <div style={{ height: 56, borderRadius: "var(--rpad)", background: "var(--fill)", color: "var(--ink)",
              display: "grid", placeItems: "center", fontWeight: 700 }}>Aa</div>
            <code style={{ fontSize: 11, color: "var(--muted)" }}>.p{i}</code>
          </div>
        ))}
      </div>
    </div>
  )
};

const RAMP = [
  { k: "page / 42 · 700 · -0.026em", size: 42, weight: 700, ls: "-0.026em", text: "Favoritos" },
  { k: "card / 23 · 700 · -0.008em", size: 23, weight: 700, ls: "-0.008em", text: "Risada do Ronaldinho" },
  { k: "control / 13.5 · 650", size: 13.5, weight: 650, ls: "0", text: "Carregar mais" },
  { k: "meta / 12.5 · 600 · muted", size: 12.5, weight: 600, ls: "0", text: "12 sons salvos", muted: true }
];

/** One family, Archivo, four steps. 650 only renders as 650 on the variable
 *  cut — on the static cut it collapses into 700 and control reads as card. */
export const TypeRamp: StoryObj = {
  render: () => (
    <div>
      {RAMP.map((r) => (
        <div key={r.k} style={{ display: "flex", alignItems: "baseline", gap: 22, borderBottom: "1px solid var(--line)", padding: "12px 0" }}>
          <code style={{ width: 190, flex: "none", fontSize: 11, color: "var(--muted)" }}>{r.k}</code>
          <span style={{ fontSize: r.size, fontWeight: r.weight, letterSpacing: r.ls, color: r.muted ? "var(--muted)" : undefined }}>
            {r.text}
          </span>
        </div>
      ))}
    </div>
  )
};
