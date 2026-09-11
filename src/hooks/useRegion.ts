import { DEFAULT_REGION, isRegion } from "../regions";
import type { Region } from "../regions";
import { useRegionState } from "../storage";

/**
 * The MyInstants catalogue's country, persisted. A stored value that is not
 * one of the curated regions — a removed country, a hand-edited or corrupt
 * key — reads as the default rather than reaching the backend.
 */
export function useRegion() {
  const [stored, setStored] = useRegionState(DEFAULT_REGION);
  const region: Region = isRegion(stored) ? stored : DEFAULT_REGION;

  return { region, setRegion: setStored };
}
