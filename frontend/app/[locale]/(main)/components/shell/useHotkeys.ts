"use client";

import { useEffect, useRef } from "react";

export interface HotkeyHandlers {
  palette: () => void;
  help: () => void;
  theme: () => void;
  study: () => void;
  sidebar: () => void;
  /** "g" followed by this key. */
  go: (key: string) => boolean;
}

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
}

/**
 * App-wide keyboard shortcuts: ⌘/Ctrl+K or "/" for the palette, "?" for help, ⇧T theme,
 * ⇧F study dock, "[" sidebar, and "g" then a letter to jump between pages.
 * Single keys are ignored while typing or while a dialog is open.
 */
export function useHotkeys(handlers: HotkeyHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    let leader = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const h = ref.current;

      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        h.palette();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      if (isTyping(event.target) || document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      if (leader && Date.now() - leader < 1200) {
        leader = 0;
        if (h.go(event.key.toLowerCase())) event.preventDefault();
        return;
      }
      leader = 0;

      switch (event.key) {
        case "/":
          event.preventDefault();
          h.palette();
          break;
        case "?":
          event.preventDefault();
          h.help();
          break;
        case "T":
          if (event.shiftKey) h.theme();
          break;
        case "F":
          if (event.shiftKey) h.study();
          break;
        case "[":
          h.sidebar();
          break;
        case "g":
          leader = Date.now();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
