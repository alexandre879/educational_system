import { ACCENT_ORDER, ACCENTS, effectiveAccent, nextAccentChange, textOn } from "@/theme";

const MINUTE = 60_000;

describe("automatic accent colour", () => {
  it("keeps the chosen accent when it's off", () => {
    expect(effectiveAccent("rose", 0, 123 * MINUTE)).toBe("rose");
    expect(nextAccentChange(0)).toBeNull();
  });

  it("moves one colour on per period, starting from the chosen one, on the clock", () => {
    const start = 1_000 * 20 * MINUTE; // a :00/:20/:40 boundary
    const shown = effectiveAccent("ocean", 20, start);
    const index = ACCENT_ORDER.indexOf(shown);
    expect(effectiveAccent("ocean", 20, start + 19 * MINUTE)).toBe(shown);
    expect(effectiveAccent("ocean", 20, start + 20 * MINUTE)).toBe(ACCENT_ORDER[(index + 1) % 6]);
    expect(nextAccentChange(20, start + 5 * MINUTE)).toBe(start + 20 * MINUTE);
  });

  it("matches the website's formula, so the app and the site show the same colour", () => {
    const now = Date.UTC(2026, 10, 8, 6, 7);
    const web = ACCENT_ORDER[(ACCENT_ORDER.indexOf("emerald") + Math.floor(now / (30 * MINUTE))) % 6];
    expect(effectiveAccent("emerald", 30, now)).toBe(web);
  });

  it("puts readable text on every accent", () => {
    for (const accent of ACCENT_ORDER) {
      expect(textOn(ACCENTS[accent].light.primary)).toBe("#FFFFFF");
    }
    // The bright dark-mode accents get dark text instead of low-contrast white.
    expect(textOn(ACCENTS.emerald.dark.primary)).toBe("#0B1220");
    expect(textOn(ACCENTS.lagoon.dark.primary)).toBe("#0B1220");
    expect(textOn(ACCENTS.ocean.dark.primary)).toBe("#FFFFFF");
  });
});
