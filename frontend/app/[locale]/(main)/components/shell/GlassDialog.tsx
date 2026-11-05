"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./panels.module.scss";

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), textarea, select, [tabindex]:not([tabindex="-1"])';

/**
 * A floating glass sheet over a dimmed, blurred page. Closes on Escape or a click outside,
 * keeps Tab inside, and gives focus back to whatever opened it.
 *
 * The scrim is a sibling of the panel (not its parent): a parent with a filter would stop the
 * panel's own backdrop-filter from seeing the page behind it.
 */
export function GlassDialog({
  open,
  onClose,
  label,
  children,
  className = "",
  position = "top",
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  position?: "top" | "center";
}) {
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);

  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
      opener?.focus?.();
    };
  }, [open]);

  if (!rendered) return null;

  return createPortal(
    <div className={styles.layer} data-state={open ? "open" : "closed"} data-position={position}>
      <div className={styles.scrim} onMouseDown={() => onCloseRef.current()} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`${styles.dialog} lg-rim ${className}`}
        onAnimationEnd={(event) => {
          if (!open && event.target === event.currentTarget) setRendered(false);
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
