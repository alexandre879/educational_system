import { translate } from "@/i18n";
import { en } from "@/i18n/messages/en";
import { ka } from "@/i18n/messages/ka";
import { ru } from "@/i18n/messages/ru";

function leaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leaves(value, prefix ? `${prefix}.${key}` : key)
  );
}

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe.each([
  ["ka", ka],
  ["ru", ru],
])("%s translations", (_language, messages) => {
  const english = new Map(leaves(en));
  const translated = new Map(leaves(messages));

  it("covers exactly the English keys", () => {
    expect([...translated.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("has no empty strings", () => {
    const empty = [...translated].filter(([, value]) => !value.trim()).map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("keeps every {placeholder} of the English text", () => {
    const mismatched = [...english]
      .filter(([key, value]) => placeholders(value).join() !== placeholders(translated.get(key) ?? "").join())
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });
});

describe("translate", () => {
  it("interpolates parameters", () => {
    expect(translate("en", "home.greeting", { name: "Nino" })).toBe("Hi, Nino");
    expect(translate("ka", "exam.progress", { current: 2, total: 5 })).toBe("კითხვა 2 / 5");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(translate("en", "home.greeting")).toBe("Hi, {name}");
  });
});
