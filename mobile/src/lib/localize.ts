import type { Localized } from "@/api/types";

/** Pick the text for `language` from a `{ en, ka, ru }` value, falling back like the web app. */
export function localize(value: Localized, language: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language] || value.ka || value.en || value.ru || "";
}
