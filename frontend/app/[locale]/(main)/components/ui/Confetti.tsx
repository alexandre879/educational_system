"use client";

import { useState, type CSSProperties } from "react";
import styles from "./confetti.module.scss";

const COLORS = ["#1677FF", "#8B5CF6", "#EC4899", "#F59E0B", "#22C55E", "#06B6D4"];

/** A one-off burst of falling confetti over the whole page (e.g. a great exam score). */
export default function Confetti({ count = 80 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: `${Math.random() * 100}vw`,
      size: `${7 + Math.random() * 7}px`,
      color: COLORS[i % COLORS.length],
      delay: `${Math.random() * 500}ms`,
      duration: `${2400 + Math.random() * 1400}ms`,
      drift: `${(Math.random() - 0.5) * 160}px`,
      spin: `${(Math.random() - 0.5) * 1080}deg`,
    }))
  );

  return (
    <div className={styles.layer} aria-hidden>
      {pieces.map((piece, index) => (
        <span
          key={index}
          className={styles.piece}
          style={
            {
              left: piece.left,
              width: piece.size,
              background: piece.color,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              "--drift": piece.drift,
              "--spin": piece.spin,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
