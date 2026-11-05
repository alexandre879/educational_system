"use client";

import { useRef } from "react";

import styles from "./login.module.scss";

/**
 * One box per digit. Typing moves forward, Backspace moves back, and a pasted or autofilled
 * code (iOS/Android "one-time-code") spreads across the boxes. Calls onComplete when full.
 */
export default function OtpInput({
  digits,
  onChange,
  onComplete,
  label,
  digitLabel,
  disabled,
}: {
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete: (code: string) => void;
  label: string;
  digitLabel: (index: number) => string;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const fill = (start: number, text: string) => {
    const typed = text.replace(/\D/g, "").split("");
    if (typed.length === 0) return;

    const next = [...digits];
    typed.forEach((digit, offset) => {
      if (start + offset < next.length) next[start + offset] = digit;
    });
    onChange(next);

    const focusIndex = Math.min(start + typed.length, next.length - 1);
    refs.current[focusIndex]?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  const clear = (index: number) => {
    const next = [...digits];
    next[index] = "";
    onChange(next);
  };

  return (
    <div className={styles.otp} role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className={`${styles.otpBox} ${digit ? styles.otpFilled : ""}`}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={digitLabel(index + 1)}
          disabled={disabled}
          autoFocus={index === 0}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            const value = event.target.value;
            if (!value) clear(index);
            else fill(index, value.slice(digit ? 1 : 0) || value);
          }}
          onPaste={(event) => {
            event.preventDefault();
            fill(0, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit && index > 0) {
              event.preventDefault();
              clear(index - 1);
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault();
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowRight" && index < digits.length - 1) {
              event.preventDefault();
              refs.current[index + 1]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
