import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "./en-US.json";
import ptBR from "./pt-BR.json";
import { defaultLocale, isLanguageId } from "./detect";
import type { LanguageId } from "./detect";

function persistedLanguage(): LanguageId | null {
  try {
    const raw = window.localStorage.getItem("language");
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    return isLanguageId(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

void i18next.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    "en-US": { translation: enUS }
  },
  lng: persistedLanguage() ?? defaultLocale(navigator.language),
  fallbackLng: "en-US",
  interpolation: { escapeValue: false }
});

export default i18next;
