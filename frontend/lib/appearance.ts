"use client";

import { useSyncExternalStore } from "react";

import { ACCENT_CYCLES, ACCENT_ORDER, APPEARANCE_KEY, THEME_KEY } from "./appearanceBoot";

/**
 * How the website looks, kept in localStorage and mirrored onto <html> as data-* attributes
 * that app/globals.css reads. The boot script (lib/appearanceBoot.ts) applies the saved
 * values before the first paint, so there is no flash of the wrong theme.
 */

export type ThemePref = "dark" | "light" | "system";
export type Accent = (typeof ACCENT_ORDER)[number];
/** Minutes between automatic accent changes; 0 keeps the chosen accent. */
export type AccentCycle = (typeof ACCENT_CYCLES)[number];
export type GlassLevel = "clear" | "regular" | "frosted";
export type Backdrop = "aurora" | "mesh" | "minimal";
export type MotionPref = "system" | "full" | "reduced";

export interface Appearance {
  theme: ThemePref;
  accent: Accent;
  accentCycle: AccentCycle;
  glass: GlassLevel;
  backdrop: Backdrop;
  motion: MotionPref;
  sidebarCollapsed: boolean;
}

/** Primary colors per accent, for Ant Design's theme and the swatches. */
export const ACCENTS: Record<Accent, { dark: string; light: string; swatch: string }> = {
  ocean: { dark: "#4c8dff", light: "#1677ff", swatch: "linear-gradient(135deg, #1677ff, #8b5cf6)" },
  violet: { dark: "#9785ff", light: "#7c3aed", swatch: "linear-gradient(135deg, #7c3aed, #d946ef)" },
  rose: { dark: "#ff6b9a", light: "#db2777", swatch: "linear-gradient(135deg, #e11d48, #c026d3)" },
  sunset: { dark: "#ff9548", light: "#ea580c", swatch: "linear-gradient(135deg, #f97316, #db2777)" },
  emerald: { dark: "#34d399", light: "#059669", swatch: "linear-gradient(135deg, #059669, #0891b2)" },
  lagoon: { dark: "#22d3ee", light: "#0891b2", swatch: "linear-gradient(135deg, #06b6d4, #4f46e5)" },
};

const DEFAULTS: Appearance = {
  theme: "dark",
  accent: "ocean",
  accentCycle: 0,
  glass: "regular",
  backdrop: "aurora",
  motion: "system",
  sidebarCollapsed: false,
};

let current: Appearance = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Appearance {
  try {
    const saved = JSON.parse(window.localStorage.getItem(APPEARANCE_KEY) || "{}") as Partial<Appearance>;
    const theme = (window.localStorage.getItem(THEME_KEY) as ThemePref | null) ?? DEFAULTS.theme;
    const merged = { ...DEFAULTS, ...saved, theme };
    // Anything unexpected in storage falls back to "off" rather than an odd interval.
    if (!ACCENT_CYCLES.includes(merged.accentCycle)) merged.accentCycle = 0;
    if (!ACCENT_ORDER.includes(merged.accent)) merged.accent = DEFAULTS.accent;
    return merged;
  } catch {
    return DEFAULTS;
  }
}

function prefersLight(): boolean {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resolvedTheme(appearance: Appearance): "dark" | "light" {
  if (appearance.theme !== "system") return appearance.theme;
  if (typeof window === "undefined") return "dark";
  return prefersLight() ? "light" : "dark";
}

function reducedMotion(appearance: Appearance): boolean {
  if (appearance.motion !== "system") return appearance.motion === "reduced";
  return prefersReducedMotion();
}

/**
 * The accent on screen right now. With an automatic accent it is the chosen one moved on one step
 * per period since 1970, so every tab (and the boot script) agrees, and the change lands on the
 * clock: every 20 minutes means at :00, :20 and :40.
 */
export function effectiveAccent(appearance: Pick<Appearance, "accent" | "accentCycle">, now = Date.now()): Accent {
  if (!appearance.accentCycle) return appearance.accent;
  const start = ACCENT_ORDER.indexOf(appearance.accent);
  const steps = Math.floor(now / (appearance.accentCycle * 60_000));
  return ACCENT_ORDER[(start + steps) % ACCENT_ORDER.length];
}

/** When the automatic accent changes next (ms since 1970), or null when it's off. */
export function nextAccentChange(appearance: Pick<Appearance, "accentCycle">, now = Date.now()): number | null {
  if (!appearance.accentCycle) return null;
  const period = appearance.accentCycle * 60_000;
  return (Math.floor(now / period) + 1) * period;
}

function apply(appearance: Appearance) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolvedTheme(appearance));
  root.setAttribute("data-accent", effectiveAccent(appearance));
  root.setAttribute("data-glass", appearance.glass);
  root.setAttribute("data-backdrop", appearance.backdrop);
  if (reducedMotion(appearance)) root.setAttribute("data-motion", "reduced");
  else root.removeAttribute("data-motion");
  if (appearance.sidebarCollapsed) root.setAttribute("data-sidebar", "collapsed");
  else root.removeAttribute("data-sidebar");
}

let cycleTimer: ReturnType<typeof setTimeout> | undefined;

/** Switch to the next automatic accent with a short cross-fade (instant with reduced motion). */
function changeAccent() {
  const root = document.documentElement;
  if (root.getAttribute("data-accent") === effectiveAccent(current)) return;
  const update = () => {
    apply(current);
    listeners.forEach((listener) => listener());
  };
  const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
  if (doc.startViewTransition && !reducedMotion(current) && document.visibilityState === "visible") {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

/** One timer, set for the exact moment the accent changes next (not a polling interval). */
function scheduleAccentChange() {
  clearTimeout(cycleTimer);
  const next = nextAccentChange(current);
  if (next == null) return;
  cycleTimer = setTimeout(() => {
    changeAccent();
    scheduleAccentChange();
  }, next - Date.now() + 50);
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  current = read();
  scheduleAccentChange();

  // Follow the OS when the user picked "system" for theme or motion.
  const reapply = () => {
    apply(current);
    listeners.forEach((listener) => listener());
  };

  // Background tabs and a sleeping laptop delay timers: catch up as soon as the page is seen again.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    changeAccent();
    scheduleAccentChange();
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", reapply);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", reapply);

  // Another tab changed the appearance.
  window.addEventListener("storage", (event) => {
    if (event.key !== APPEARANCE_KEY && event.key !== THEME_KEY) return;
    current = read();
    reapply();
    scheduleAccentChange();
  });
}

export function getAppearance(): Appearance {
  ensureLoaded();
  return current;
}

export function setAppearance(patch: Partial<Appearance>) {
  ensureLoaded();
  current = { ...current, ...patch };

  try {
    const { theme, ...rest } = current;
    window.localStorage.setItem(THEME_KEY, theme);
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(rest));
  } catch {
    // Private mode or storage blocked: the change still applies to this page.
  }

  apply(current);
  scheduleAccentChange();
  listeners.forEach((listener) => listener());
}

/** Back to the defaults, keeping the sidebar as it is. */
export function resetAppearance() {
  const { theme, accent, accentCycle, glass, backdrop, motion } = DEFAULTS;
  setAppearance({ theme, accent, accentCycle, glass, backdrop, motion });
}

/** Flip between light and dark (leaving "system" for an explicit choice). */
export function toggleTheme() {
  setAppearance({ theme: resolvedTheme(getAppearance()) === "dark" ? "light" : "dark" });
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getServerSnapshot = () => DEFAULTS;

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, getAppearance, getServerSnapshot);
}

/** The accent on screen now (follows automatic changes); use it for colours set from JS. */
export function useEffectiveAccent(): Accent {
  return useSyncExternalStore(
    subscribe,
    () => effectiveAccent(getAppearance()),
    () => DEFAULTS.accent
  );
}
