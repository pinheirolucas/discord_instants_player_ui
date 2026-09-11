export const SLOT_COUNT = 6;

export type SlotClass = "p0" | "p1" | "p2" | "p3" | "p4" | "p5";

/**
 * Stable palette slot for a clip.
 *
 * Keyed on the url, never on list position: a card that changes colour when
 * you type in the search box, or when a second page loads, reads as a
 * different card. FNV-1a, which is plenty for spreading a few hundred urls
 * across six buckets.
 */
export function slotFor(url: string): SlotClass {
  let hash = 2166136261;

  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `p${(hash >>> 0) % SLOT_COUNT}` as SlotClass;
}
