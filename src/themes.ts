// The eight palettes. The mechanism to switch between them is built and
// persisted; nothing in the UI exposes it yet, so every install runs on
// DEFAULT_THEME. Adding a ninth means answering it twice over in
// tokens.css — once light, once dark — plus six palette slots.

export const THEMES = [
  { id: "esmalte", name: "Esmalte", desc: "Azul profundo e mostarda de placa antiga" },
  { id: "frevo", name: "Frevo", desc: "Fluorescentes de sombrinha de frevo" },
  { id: "cerrado", name: "Cerrado", desc: "Ocre, musgo e terracota" },
  { id: "brasa", name: "Brasa", desc: "Só tons quentes, do tijolo ao ouro" },
  { id: "fliperama", name: "Fliperama", desc: "Cor no talo sobre quase preto" },
  { id: "discord", name: "Discord", desc: "Índigo e as cores de status do Discord" },
  { id: "contraste", name: "Alto contraste", desc: "Máxima legibilidade, cor contida" },
  { id: "oled", name: "OLED", desc: "Preto absoluto e branco puro" }
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "esmalte";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export type ColorMode = "auto" | "light" | "dark";
export type ResolvedMode = "light" | "dark";

export const COLOR_MODES: ColorMode[] = ["auto", "light", "dark"];

export function isColorMode(value: unknown): value is ColorMode {
  return value === "auto" || value === "light" || value === "dark";
}

export type PlatformId = "mac" | "win" | "linux";

export function isPlatformId(value: unknown): value is PlatformId {
  return value === "mac" || value === "win" || value === "linux";
}
