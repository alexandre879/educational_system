"use client";

import type { ReactNode } from "react";
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

export function Loading() {
  return (
    <div className={ui.loading} role="status">
      <div className={ui.spinner} />
    </div>
  );
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
  return (
    <div className={ui.tabs} role="tablist">
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
