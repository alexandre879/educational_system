"use client";

import type { CSSProperties, ReactNode } from "react";

import styles from "./panels.module.scss";

/** iOS-style segmented control: a glass thumb springs to the chosen option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={styles.segmented}
      style={{ "--n": options.length, "--i": index } as CSSProperties}
    >
      <span className={styles.segmentThumb} aria-hidden="true" />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`${styles.segment} ${active ? styles.segmentActive : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
