import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, Platform, useColorScheme, type ViewStyle } from "react-native";

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

interface ThemeContextValue {
  colors: Colors;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
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
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    applyPreference(next);
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: scheme === "dark" ? dark : light, scheme, preference, setPreference }),
    [scheme, preference, setPreference]
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
