import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, AppState, Platform, useColorScheme, type ViewStyle } from "react-native";

// Brand: the web app's blue, extended with a violet accent for gradients.
const light = {
  background: "#F3F5FA",
  surface: "#FFFFFF",
  surfaceMuted: "#EDF0F7",
  border: "rgba(15, 23, 42, 0.08)",
  text: "#0B1220",
  textSecondary: "#5B6577",
  textMuted: "#97A0B2",
  primary: "#1677FF",
  primaryMuted: "rgba(22, 119, 255, 0.10)",
  onPrimary: "#FFFFFF",
  /** Text on the deep brand gradients and on avatar colours: always white. */
  onGradient: "#FFFFFF",
  accent: "#7C3AED",
  success: "#16A34A",
  successMuted: "rgba(22, 163, 74, 0.12)",
  danger: "#E5484D",
  dangerMuted: "rgba(229, 72, 77, 0.12)",
  warning: "#D97706",
  warningMuted: "rgba(245, 158, 11, 0.14)",
  /** Hero gradient, top-left → bottom-right. */
  gradient: ["#1677FF", "#5B5CFF", "#8B5CF6"] as readonly [string, string, string],
  /** Soft elevation for cards (dark mode relies on borders instead). */
  shadow: "0px 1px 2px rgba(16, 24, 40, 0.05), 0px 8px 24px rgba(16, 24, 40, 0.06)",
};

export type Colors = typeof light;

const dark: Colors = {
  background: "#090B10",
  surface: "#12161F",
  surfaceMuted: "#1B2130",
  border: "rgba(255, 255, 255, 0.07)",
  text: "#F2F4F8",
  textSecondary: "#A6AFC0",
  textMuted: "#6B7487",
  primary: "#4C8DFF",
  primaryMuted: "rgba(76, 141, 255, 0.16)",
  onPrimary: "#FFFFFF",
  onGradient: "#FFFFFF",
  accent: "#A78BFA",
  success: "#22C55E",
  successMuted: "rgba(34, 197, 94, 0.16)",
  danger: "#F87171",
  dangerMuted: "rgba(248, 113, 113, 0.16)",
  warning: "#FBBF24",
  warningMuted: "rgba(251, 191, 36, 0.16)",
  gradient: ["#1556D6", "#4B47E0", "#7344D9"] as const,
  shadow: "0px 0px 0px rgba(0, 0, 0, 0)",
};

// ---------------------------------------------------------------------------
// Accent colours: the same six as the website (lib/appearance.ts and app/globals.css there).
// ---------------------------------------------------------------------------

export const ACCENT_ORDER = ["ocean", "violet", "rose", "sunset", "emerald", "lagoon"] as const;
export type Accent = (typeof ACCENT_ORDER)[number];

/** Minutes between automatic accent changes; 0 keeps the chosen accent. */
export const ACCENT_CYCLES = [0, 10, 20, 30, 60] as const;
export type AccentCycle = (typeof ACCENT_CYCLES)[number];

type AccentColors = { primary: string; accent: string; gradient: readonly [string, string, string] };

export const ACCENTS: Record<Accent, { light: AccentColors; dark: AccentColors }> = {
  ocean: {
    light: { primary: "#1677FF", accent: "#7C3AED", gradient: ["#1677FF", "#5B5CFF", "#8B5CF6"] },
    dark: { primary: "#4C8DFF", accent: "#A78BFA", gradient: ["#1556D6", "#4B47E0", "#7344D9"] },
  },
  violet: {
    light: { primary: "#7C3AED", accent: "#D946EF", gradient: ["#7C3AED", "#A855F7", "#D946EF"] },
    dark: { primary: "#9785FF", accent: "#E879F9", gradient: ["#5B21B6", "#7C3AED", "#C026D3"] },
  },
  rose: {
    light: { primary: "#DB2777", accent: "#C026D3", gradient: ["#E11D48", "#EC4899", "#C026D3"] },
    dark: { primary: "#FF6B9A", accent: "#E879F9", gradient: ["#BE123C", "#DB2777", "#A21CAF"] },
  },
  sunset: {
    light: { primary: "#EA580C", accent: "#DB2777", gradient: ["#F97316", "#EF4444", "#DB2777"] },
    dark: { primary: "#FF9548", accent: "#FB7185", gradient: ["#EA580C", "#E11D48", "#BE185D"] },
  },
  emerald: {
    light: { primary: "#059669", accent: "#0891B2", gradient: ["#059669", "#0D9488", "#0891B2"] },
    dark: { primary: "#34D399", accent: "#22D3EE", gradient: ["#047857", "#0D9488", "#0E7490"] },
  },
  lagoon: {
    light: { primary: "#0891B2", accent: "#4F46E5", gradient: ["#0891B2", "#0284C7", "#4F46E5"] },
    dark: { primary: "#22D3EE", accent: "#818CF8", gradient: ["#0E7490", "#0369A1", "#4338CA"] },
  },
};

/**
 * The accent on screen at `now`. With automatic changes it is the chosen accent moved on one step
 * per period since 1970, exactly as on the website, so both agree and changes land on the clock
 * (every 20 minutes means at :00, :20 and :40).
 */
export function effectiveAccent(accent: Accent, cycle: AccentCycle, now = Date.now()): Accent {
  if (!cycle) return accent;
  const start = ACCENT_ORDER.indexOf(accent);
  return ACCENT_ORDER[(start + Math.floor(now / (cycle * 60_000))) % ACCENT_ORDER.length];
}

/** When the automatic accent changes next (ms since 1970), or null when it's off. */
export function nextAccentChange(cycle: AccentCycle, now = Date.now()): number | null {
  if (!cycle) return null;
  const period = cycle * 60_000;
  return (Math.floor(now / period) + 1) * period;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White text on the accent when it reads at 3:1 or better, otherwise near-black (light dark-mode accents). */
export function textOn(background: string): string {
  const white = 1.05 / (luminance(background) + 0.05);
  return white >= 3 ? "#FFFFFF" : "#0B1220";
}

function withAccent(base: Colors, accent: Accent, scheme: "light" | "dark"): Colors {
  const palette = ACCENTS[accent][scheme];
  return {
    ...base,
    primary: palette.primary,
    primaryMuted: withAlpha(palette.primary, scheme === "dark" ? 0.16 : 0.1),
    onPrimary: textOn(palette.primary),
    accent: palette.accent,
    gradient: palette.gradient,
  };
}

// Each subject gets a stable color so it's recognisable across screens.
const SUBJECT_COLORS = ["#1677FF", "#8B5CF6", "#EC4899", "#F97316", "#14B8A6", "#22C55E", "#EAB308", "#06B6D4"];

export function subjectColor(subjectId: number | null | undefined): string {
  if (subjectId == null) return SUBJECT_COLORS[0];
  return SUBJECT_COLORS[Math.abs(subjectId) % SUBJECT_COLORS.length];
}

/** `#RRGGBB` → `#RRGGBBAA` with the given opacity (0–1). */
export function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "pref.theme";
const ACCENT_KEY = "pref.accent";
const ACCENT_CYCLE_KEY = "pref.accentCycle";

interface ThemeContextValue {
  colors: Colors;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** The accent the user picked. */
  accent: Accent;
  /** The accent on screen now (differs from `accent` while it changes automatically). */
  shownAccent: Accent;
  accentCycle: AccentCycle;
  /** Picking an accent by hand keeps it: automatic changes stop. */
  setAccent: (accent: Accent) => void;
  setAccentCycle: (cycle: AccentCycle) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyPreference(preference: ThemePreference) {
  // Overriding the app-wide scheme also restyles native UI (tab bar, alerts, keyboard).
  // react-native-web has no setColorScheme; there the provider's resolved scheme is enough.
  if (Platform.OS === "web") return;
  Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [accent, setAccentState] = useState<Accent>("ocean");
  const [accentCycle, setAccentCycleState] = useState<AccentCycle>(0);
  // Bumped when the automatic accent is due to change, or when the app comes back to the foreground.
  const [now, setNow] = useState(() => Date.now());
  const systemScheme = useColorScheme();
  // Resolve from the preference directly: on web, Appearance.setColorScheme doesn't feed useColorScheme.
  const scheme = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark") {
          applyPreference(stored);
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined);

    AsyncStorage.multiGet([ACCENT_KEY, ACCENT_CYCLE_KEY])
      .then(([[, storedAccent], [, storedCycle]]) => {
        if (storedAccent && (ACCENT_ORDER as readonly string[]).includes(storedAccent)) setAccentState(storedAccent as Accent);
        const cycle = Number(storedCycle);
        if ((ACCENT_CYCLES as readonly number[]).includes(cycle)) setAccentCycleState(cycle as AccentCycle);
      })
      .catch(() => undefined);
  }, []);

  // One timer, set for the exact moment the accent changes next (not a polling interval).
  useEffect(() => {
    const next = nextAccentChange(accentCycle, now);
    if (next == null) return;
    const timer = setTimeout(() => setNow(Date.now()), next - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [accentCycle, now]);

  // Timers don't run in the background: catch up when the app is opened again.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => subscription.remove();
  }, []);

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next);
    setAccentCycleState(0);
    AsyncStorage.multiSet([
      [ACCENT_KEY, next],
      [ACCENT_CYCLE_KEY, "0"],
    ]).catch(() => undefined);
  }, []);

  const setAccentCycle = useCallback((cycle: AccentCycle) => {
    setAccentCycleState(cycle);
    setNow(Date.now());
    AsyncStorage.setItem(ACCENT_CYCLE_KEY, String(cycle)).catch(() => undefined);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    applyPreference(next);
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const shownAccent = effectiveAccent(accent, accentCycle, now);
  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: withAccent(scheme === "dark" ? dark : light, shownAccent, scheme),
      scheme,
      preference,
      setPreference,
      accent,
      shownAccent,
      accentCycle,
      setAccent,
      setAccentCycle,
    }),
    [scheme, preference, setPreference, accent, shownAccent, accentCycle, setAccent, setAccentCycle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

/**
 * The page background: soft pools of the brand colors spread over the whole screen, for the
 * glass surfaces to pick up. A CSS gradient that React Native draws natively, so it fills any
 * screen size and stays put while content scrolls. The pools sit below the top edge, so there
 * is no seam under the (solid) navigation header.
 */
export function backdropGradient(colors: Colors, scheme: "light" | "dark"): string {
  const strength = scheme === "dark" ? 1 : 0.7;
  const pool = (color: string, alpha: number, size: string, at: string) =>
    `radial-gradient(${size} at ${at}, ${withAlpha(color, alpha * strength)} 0%, ${withAlpha(color, 0)} 90%)`;

  return [
    pool(colors.primary, 0.3, "95% 34%", "8% 30%"),
    pool(colors.accent, 0.22, "85% 32%", "100% 58%"),
    pool(colors.primary, 0.2, "110% 30%", "15% 100%"),
  ].join(", ");
}

/** Background style for a full screen: the brand-color backdrop over the base color. */
export function useBackdropStyle(): ViewStyle {
  const { colors, scheme } = useTheme();
  return useMemo(() => {
    const gradient = backdropGradient(colors, scheme);
    // react-native-web passes plain CSS through; native renders the experimental prop.
    return Platform.OS === "web"
      ? ({ backgroundColor: colors.background, backgroundImage: gradient } as ViewStyle)
      : { backgroundColor: colors.background, experimental_backgroundImage: gradient };
  }, [colors, scheme]);
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
