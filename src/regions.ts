// The countries MyInstants can browse. Each was checked to return a populated
// listing at myinstants.com/en/index/{code}/. The list is curated rather than
// open-ended because an unknown code is not an error there: it answers 200
// with an empty page, which would look like a broken catalogue.
//
// Codes are two lowercase letters, which is exactly what the backend accepts
// (`^[a-z]{2}$`); anything else it rejects with invalid_region.
export const REGIONS = [
  "us",
  "br",
  "pt",
  "gb",
  "es",
  "mx",
  "ar",
  "co",
  "cl",
  "pe",
  "fr",
  "de",
  "it",
  "nl",
  "in",
  "jp",
  "kr",
  "ru",
  "ca",
  "au",
  "ph",
  "id"
] as const;

export type Region = (typeof REGIONS)[number];

/** The UI is in Portuguese, so the catalogue starts on Brazil. */
export const DEFAULT_REGION: Region = "br";

export function isRegion(value: unknown): value is Region {
  return (REGIONS as readonly unknown[]).includes(value);
}

let displayNames: Intl.DisplayNames | null | undefined;

/** The country's name in Portuguese, falling back to the bare code where the
 *  runtime has no Intl.DisplayNames. */
export function regionLabel(region: Region): string {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });
    } catch {
      displayNames = null;
    }
  }

  return displayNames?.of(region.toUpperCase()) ?? region.toUpperCase();
}
