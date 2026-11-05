"use client";

import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import { useTranslations } from "next-intl";
import axios from "axios";

import { subjectColor, withAlpha } from "@/lib/subjects";
import ui from "./ui.module.scss";

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  backHref,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backHref?: string;
}) {
  const t = useTranslations("App.web");
  return (
    <>
      {backHref ? (
        <Link href={backHref} className={ui.backLink}>
          <FaArrowLeft aria-hidden /> {t("back")}
        </Link>
      ) : null}
      <div className={ui.header}>
        <div className={ui.titleWrap}>
          <span className={ui.headerIcon}>{icon}</span>
          <div>
            <h1 className={ui.title}>{title}</h1>
            {subtitle ? <div className={ui.subtitle}>{subtitle}</div> : null}
          </div>
        </div>
        {actions}
      </div>
    </>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className={ui.sectionHeader}>
      <h2 className={ui.sectionTitle}>{title}</h2>
      {action}
    </div>
  );
}

/** Shimmering glass placeholders; compact enough for a whole page or a single section. */
export function Loading() {
  return (
    <div className={ui.skeleton} role="status" aria-busy="true">
      {[64, 64, 64].map((height, index) => (
        <div
          key={index}
          className={ui.skeletonBlock}
          style={{ height, opacity: 1 - index * 0.22, "--delay": `${index * 120}ms` } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** A number that counts up to its value (eases out; instant with reduced motion). */
export function CountUp({ value, decimals = 0, duration = 900 }: { value: number; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (document.documentElement.dataset.motion === "reduced" || from === value) {
      fromRef.current = value;
      setShown(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = value;
    };
  }, [value, duration]);

  return <>{shown.toFixed(decimals)}</>;
}

export function Empty({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className={ui.empty}>
      <div className={ui.emptyTitle}>{title}</div>
      {message ? <div>{message}</div> : null}
      {action}
    </div>
  );
}

/** A failed request: "no access" for 403s, otherwise a generic message, with a retry button. */
export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations("App.common");
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const message = status === 403 ? t("forbidden") : status === undefined ? t("networkError") : t("genericError");

  return (
    <div className={`${ui.empty} ${ui.error}`}>
      <div className={ui.emptyTitle}>{t("errorTitle")}</div>
      <div>{message}</div>
      {onRetry && status !== 403 ? (
        <button type="button" className={ui.btn} onClick={onRetry}>
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

export type Tone = "ok" | "bad" | "warn" | "primary" | "accent" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  ok: ui.toneOk,
  bad: ui.toneBad,
  warn: ui.toneWarn,
  primary: ui.tonePrimary,
  accent: ui.toneAccent,
  neutral: ui.toneNeutral,
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`${ui.pill} ${TONE_CLASS[tone]}`}>{children}</span>;
}

/** Pill in the subject's own color, so a subject looks the same on every page. */
export function SubjectBadge({ subjectId, label }: { subjectId: number | null | undefined; label: string }) {
  const color = subjectColor(subjectId);
  return (
    <span className={ui.pill} style={{ background: withAlpha(color, 0.14), color }} title={label}>
      <span className={ui.dot} style={{ background: color }} />
      {label}
    </span>
  );
}

/** Rounded square with the subject's initial. */
export function SubjectMark({ subjectId, label, size = 44 }: { subjectId: number | null | undefined; label: string; size?: number }) {
  const color = subjectColor(subjectId);
  return (
    <span
      className={ui.subjectMark}
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: withAlpha(color, 0.16),
        color,
        fontSize: size * 0.4,
      }}
    >
      {(label.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Circle with a person's initials in a color derived from their name (no photo needed). */
export function NameAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const words = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const color = subjectColor(hash);

  return (
    <span
      className={ui.subjectMark}
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: withAlpha(color, 0.18),
        color,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </span>
  );
}

export function ProgressBar({ value, color = "var(--primary-blue)" }: { value: number; color?: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={ui.progress} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={ui.progressFill} style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  // Slide the glass thumb under the selected tab (placed without animation the first time).
  useLayoutEffect(() => {
    const list = listRef.current;
    const thumb = thumbRef.current;
    if (!list || !thumb) return;

    const place = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) {
        thumb.style.opacity = "0";
        return;
      }
      const first = !thumb.dataset.ready;
      if (first) thumb.style.transition = "none";
      thumb.style.width = `${active.offsetWidth}px`;
      thumb.style.transform = `translateX(${active.offsetLeft}px)`;
      thumb.style.opacity = "1";
      if (first) {
        thumb.getBoundingClientRect();
        thumb.style.transition = "";
        thumb.dataset.ready = "1";
      }
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value, options.length]);

  return (
    <div ref={listRef} className={ui.tabs} role="tablist">
      <span ref={thumbRef} className={ui.tabThumb} aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`${ui.tab} ${option.value === value ? ui.tabActive : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div className={ui.chips}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={`${ui.chip} ${option.value === value ? ui.chipActive : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
