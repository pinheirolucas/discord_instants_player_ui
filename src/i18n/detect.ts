export const LANGUAGES = ["pt-BR", "en-US"] as const;
export type LanguageId = (typeof LANGUAGES)[number];

export function isLanguageId(value: unknown): value is LanguageId {
  return (LANGUAGES as readonly unknown[]).includes(value);
}

export function defaultLocale(osLocale: string): LanguageId {
  const primary = osLocale.split("-")[0]?.toLowerCase();
  return primary === "pt" ? "pt-BR" : "en-US";
}
