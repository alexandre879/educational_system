/** A value the API returns either as plain text or as `{ en, ka, ru }` translations. */
export type LocalizedValue = string | Record<string, string> | null | undefined;

export function getLocalizedValue(value: LocalizedValue, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] || value.ka || value.en || value.ru || "";
}
