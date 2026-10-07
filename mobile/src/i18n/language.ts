import { DEFAULT_LANGUAGE, type Language } from "@/config";

// Mirrors the I18nProvider state for code outside React (the API client's Accept-Language).
let current: Language = DEFAULT_LANGUAGE;

export function getLanguage(): Language {
  return current;
}

export function setCurrentLanguage(language: Language): void {
  current = language;
}
