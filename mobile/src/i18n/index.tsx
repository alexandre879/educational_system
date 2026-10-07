import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from "@/config";

import { setCurrentLanguage } from "./language";
import { en, type Messages } from "./messages/en";
import { ka } from "./messages/ka";
import { ru } from "./messages/ru";

const MESSAGES: Record<Language, Messages> = { en, ka, ru };
const STORAGE_KEY = "pref.language";

/** Each language shown in its own script, as in the web app's switcher. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ka: "ქართული",
  en: "English",
  ru: "Русский",
};

// "home.greeting" | "auth.sendCode" | … — typos in keys fail type-checking.
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Messages>;
export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(language: Language, key: TranslationKey, params?: TranslateParams): string {
  const template = lookup(MESSAGES[language], key) ?? lookup(en, key) ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return isLanguage(code) ? code : DEFAULT_LANGUAGE;
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
  /** False until the saved language preference has been read. */
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const initial = deviceLanguage();
    setCurrentLanguage(initial);
    return initial;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isLanguage(stored)) {
          setCurrentLanguage(stored);
          setLanguageState(stored);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      ready,
      t: (key, params) => translate(language, key, params),
    }),
    [language, setLanguage, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
