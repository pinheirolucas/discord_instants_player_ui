import { useEffect } from "react";
import i18n from "../i18n";
import { defaultLocale, isLanguageId } from "../i18n/detect";
import { useLanguageState } from "../storage";
import { useStamp } from "./useStamp";

export function useLanguage() {
  const [stored, setStored] = useLanguageState(defaultLocale(navigator.language));
  const language = isLanguageId(stored) ? stored : defaultLocale(navigator.language);

  useStamp("lang", language);

  useEffect(() => {
    document.documentElement.lang = language;
    void i18n.changeLanguage(language);
  }, [language]);

  return { language, setLanguage: setStored };
}
