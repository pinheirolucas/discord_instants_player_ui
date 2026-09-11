const BARS = 40;
const STEP = 6.2;

/**
 * The decorative waveform on a card.
 *
 * Deterministic from the clip's name — a seeded LCG, ported from the design
 * canvas — so the same clip always draws the same wave. Nothing here touches
 * the audio: the app only ever holds a base64 clip it is about to play, and
 * decoding one per card to draw a real waveform would be absurd for what is
 * a texture.
 */
export function wavePath(name: string): string {
  let seed = 11;

  for (let i = 0; i < name.length; i++) {
    seed = (seed * 31 + name.charCodeAt(i)) % 99991;
  }

  let path = "";
  let x = 3;

  for (let i = 0; i < BARS; i++) {
    seed = (seed * 1103515 + 12345) % 2147483;
    const height = 4 + ((seed % 1000) / 1000) * 19;
    path += `M${x.toFixed(1)} ${(13 + height / 2).toFixed(1)}v-${height.toFixed(1)} `;
    x += STEP;
  }

  return path.trim();
}
