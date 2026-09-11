export interface Size {
  width: number;
  height: number;
}

export interface Fit extends Size {
  scale: number;
  x: number;
  y: number;
}

/**
 * Where the app sits on the Aparência stage.
 *
 * `natural` is the box the app fills with the shell closed; it keeps that
 * size while staged, so nothing inside it reflows — it is only scaled, to
 * fit `stage` with `pad` of backdrop on every side, and centred. Never
 * scales up. Null while either box has no size yet (jsdom, or a frame
 * before layout), which leaves the app unscaled rather than collapsed.
 */
export function fitFrame(stage: Size, natural: Size, pad: number): Fit | null {
  if (stage.width <= 0 || stage.height <= 0 || natural.width <= 0 || natural.height <= 0) {
    return null;
  }

  const scale = Math.min(
    1,
    (stage.width - 2 * pad) / natural.width,
    (stage.height - 2 * pad) / natural.height
  );

  if (scale <= 0) {
    return null;
  }

  return {
    width: natural.width,
    height: natural.height,
    scale,
    x: (stage.width - natural.width * scale) / 2,
    y: (stage.height - natural.height * scale) / 2
  };
}
