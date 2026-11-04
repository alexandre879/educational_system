import { useSyncExternalStore } from "react";

/**
 * A Pomodoro-style focus timer that survives navigation and reloads: the end time is kept
 * in localStorage, so the countdown is right even after the tab was closed for a while.
 * Every fourth focus session is followed by a long break.
 */

export type FocusPhase = "focus" | "short" | "long";

export interface FocusState {
  phase: FocusPhase;
  running: boolean;
  /** When the running phase ends (epoch ms). */
  endsAt: number | null;
  /** Time left while paused (ms). */
  remaining: number;
  minutes: Record<FocusPhase, number>;
  /** Focus sessions finished on `day`. */
  completed: number;
  day: string;
  /** Focus sessions since the last long break. */
  round: number;
}

const KEY = "focusTimer";
const DEFAULT_MINUTES: Record<FocusPhase, number> = { focus: 25, short: 5, long: 15 };

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function initial(): FocusState {
  return {
    phase: "focus",
    running: false,
    endsAt: null,
    remaining: DEFAULT_MINUTES.focus * 60_000,
    minutes: DEFAULT_MINUTES,
    completed: 0,
    day: today(),
    round: 0,
  };
}

let state: FocusState = initial();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "null") as Partial<FocusState> | null;
    if (saved) state = { ...state, ...saved, minutes: { ...DEFAULT_MINUTES, ...saved.minutes } };
  } catch {
    // Corrupt or blocked storage: start fresh.
  }
  if (state.day !== today()) state = { ...state, day: today(), completed: 0 };
}

function set(patch: Partial<FocusState>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // The timer still works for this page.
  }
  listeners.forEach((listener) => listener());
}

export function remainingMs(focus: FocusState, now = Date.now()): number {
  return focus.running && focus.endsAt ? Math.max(0, focus.endsAt - now) : focus.remaining;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function advance(finished: boolean) {
  if (state.phase === "focus") {
    const round = state.round + 1;
    const next: FocusPhase = round % 4 === 0 ? "long" : "short";
    set({
      phase: next,
      running: false,
      endsAt: null,
      remaining: state.minutes[next] * 60_000,
      completed: state.completed + (finished ? 1 : 0),
      round: next === "long" ? 0 : round,
    });
  } else {
    set({ phase: "focus", running: false, endsAt: null, remaining: state.minutes.focus * 60_000 });
  }
}

export const focusTimer = {
  get: () => {
    load();
    return state;
  },
  start() {
    load();
    if (state.running) return;
    const remaining = state.remaining > 0 ? state.remaining : state.minutes[state.phase] * 60_000;
    set({ running: true, endsAt: Date.now() + remaining, remaining });
  },
  pause() {
    if (!state.running) return;
    set({ running: false, remaining: remainingMs(state), endsAt: null });
  },
  toggle() {
    if (focusTimer.get().running) focusTimer.pause();
    else focusTimer.start();
  },
  reset() {
    set({ running: false, endsAt: null, remaining: state.minutes[state.phase] * 60_000 });
  },
  setPhase(phase: FocusPhase) {
    set({ phase, running: false, endsAt: null, remaining: state.minutes[phase] * 60_000 });
  },
  setMinutes(phase: FocusPhase, minutes: number) {
    const value = Math.max(1, Math.min(120, Math.round(minutes)));
    const minutesByPhase = { ...state.minutes, [phase]: value };
    const idle = state.phase === phase && !state.running;
    set({ minutes: minutesByPhase, ...(idle ? { remaining: value * 60_000 } : {}) });
  },
  skip() {
    advance(false);
  },
  /** Called by the ticker when the running phase reaches zero. */
  complete() {
    if (state.day !== today()) set({ day: today(), completed: 0 });
    advance(true);
  },
};

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot = initial();

export function useFocusTimer(): FocusState {
  return useSyncExternalStore(subscribe, focusTimer.get, () => serverSnapshot);
}
