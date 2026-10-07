"use client";

import ui from "./ui.module.scss";

type MarkTone = { color: string; background: string };

/** Marks are 1–10: 9–10 excellent, 7–8 good, 5–6 fair, lower needs attention. */
export function markTone(value: number): MarkTone {
  if (value >= 9) return { color: "var(--ok)", background: "var(--ok-muted)" };
  if (value >= 7) return { color: "var(--primary-blue)", background: "var(--primary-muted)" };
  if (value >= 5) return { color: "var(--warn)", background: "var(--warn-muted)" };
  return { color: "var(--bad)", background: "var(--bad-muted)" };
}

export function MarkChip({
  value,
  size = 36,
  title,
  onClick,
}: {
  value: number;
  size?: number;
  title?: string;
  onClick?: () => void;
}) {
  const tone = markTone(value);
  const style = { width: size, height: size, color: tone.color, background: tone.background };

  if (!onClick) {
    return (
      <span className={ui.markChip} style={style} title={title}>
        {value}
      </span>
    );
  }
  return (
    <button type="button" className={ui.markChip} style={style} title={title} onClick={onClick}>
      {value}
    </button>
  );
}

/** "8.4" pill coloured like a mark, or a dash when there are no marks yet. */
export function AverageBadge({ value }: { value: number | null | undefined }) {
  const tone =
    value == null ? { color: "var(--text-muted)", background: "var(--surface-muted)" } : markTone(Math.round(value));
  return (
    <span className={ui.average} style={{ color: tone.color, background: tone.background }}>
      {value == null ? "—" : value.toFixed(1)}
    </span>
  );
}
