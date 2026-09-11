/**
 * Resolve any CSS colour — oklch included — to "#rrggbb".
 *
 * Electron's setTitleBarOverlay and setBackgroundColor take hex or rgb and
 * will not parse oklch. Rather than keep a second, hand-written table of hex
 * values that can drift from tokens.css, paint one pixel in the colour and
 * read it back: the canvas is sRGB, so this is exactly the colour the OS
 * should draw.
 */
export function toHex(cssColor: string): string {
  const value = cssColor.trim();
  if (!value) {
    return "";
  }

  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return "";
  }

  // An unparseable value leaves fillStyle unchanged, so reset it first
  // rather than silently reporting whatever the last call painted.
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);

  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
