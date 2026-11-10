"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { getLocalizedValue } from "@/lib/localized";
import { formatDay, formatTime, toISODate } from "@/lib/dates";
import { subjectColor } from "@/lib/subjects";
import type { SessionMini } from "@/lib/types";
import styles from "./exam-activity.module.scss";

/** Ticks every second while `active`, so countdowns stay live. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function formatLeft(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Exams running right now: a glowing banner with a live countdown and a way back in.
 * Renders nothing when there are none (no "no active exams" card).
 */
export function LiveExams({ sessions, locale }: { sessions: SessionMini[]; locale: string }) {
  const t = useTranslations("Home");
  const tApp = useTranslations("App");
  const now = useNow(sessions.length > 0);
  const live = sessions.filter((s) => s.ends_at && new Date(s.ends_at).getTime() > now);
  if (!live.length) return null;

  return (
    <div className={styles.liveStack}>
      {live.map((s) => {
        const left = new Date(s.ends_at as string).getTime() - now;
        const total = (s.exam.duration || 0) * 60_000;
        const progress = total ? Math.min(1, Math.max(0, 1 - left / total)) : 0;
        return (
          <section key={s.id} className={styles.live} style={{ "--c": subjectColor(s.subject.id) } as CSSProperties}>
            <div className={styles.liveMain}>
              <span className={styles.livePill}>
                <span className={styles.livePulse} aria-hidden="true" />
                {t("live")}
              </span>
              <div className={styles.liveText}>
                <span className={styles.liveTitle}>{getLocalizedValue(s.exam.title, locale)}</span>
                <span className={styles.liveSub}>{getLocalizedValue(s.subject.name, locale)}</span>
              </div>
            </div>
            <div className={styles.liveSide}>
              <span className={styles.liveClock} role="timer" aria-live="off">
                {t("timeLeft", { time: formatLeft(left) })}
              </span>
              <Link href={`/${locale}/exam/${s.exam.id}/start`} className={styles.liveButton}>
                {tApp("home.continueExam")}
                <ArrowRight size={16} />
              </Link>
            </div>
            <span className={styles.liveTrack} aria-hidden="true">
              <span style={{ "--v": progress } as CSSProperties} />
            </span>
          </section>
        );
      })}
    </div>
  );
}

/** Recent exams on a timeline grouped by day; finished ones open their answer review. */
export function ExamTimeline({ sessions, locale }: { sessions: SessionMini[]; locale: string }) {
  const tApp = useTranslations("App");
  const todayKey = toISODate(new Date());
  const yesterdayKey = toISODate(new Date(Date.now() - 86_400_000));

  const groups: { key: string; label: string; items: SessionMini[] }[] = [];
  for (const s of sessions) {
    const date = s.started_at ? new Date(s.started_at) : null;
    const key = date ? toISODate(date) : "unknown";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label = !date
        ? "—"
        : key === todayKey
          ? tApp("common.today")
          : key === yesterdayKey
            ? tApp("time.yesterday")
            : formatDay(date, tApp);
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(s);
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{tApp("home.recentExams")}</h2>
        <Link href={`/${locale}/exam?tab=results`} className={styles.seeAll}>
          {tApp("home.seeAll")}
          <ChevronRight size={15} />
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className={styles.empty}>{tApp("home.noSessionsYet")}</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className={styles.day}>
            <span className={styles.dayLabel}>{group.label}</span>
            <ol className={styles.timeline}>
              {group.items.map((s) => {
                const max = s.max_score ?? 0;
                const ratio = max ? Math.min(1, Math.max(0, s.score_so_far / max)) : 0;
                const title = getLocalizedValue(s.exam.title, locale);
                const body = (
                  <>
                    <span className={styles.dot} aria-hidden="true" />
                    <div className={styles.itemTop}>
                      <span className={styles.itemTitle} title={title}>
                        {title}
                      </span>
                      <span className={styles.score}>
                        {s.score_so_far}
                        {max ? <span className={styles.scoreMax}> / {max}</span> : null}
                      </span>
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.subject}>{getLocalizedValue(s.subject.name, locale)}</span>
                      <span className={styles.metaSep} aria-hidden="true">
                        ·
                      </span>
                      <span>{s.finished ? tApp("home.finished") : tApp("home.inProgress")}</span>
                      {s.started_at ? (
                        <>
                          <span className={styles.metaSep} aria-hidden="true">
                            ·
                          </span>
                          <span>{formatTime(s.started_at)}</span>
                        </>
                      ) : null}
                    </div>
                    {max ? (
                      <span className={styles.bar} aria-hidden="true">
                        <span style={{ "--v": ratio } as CSSProperties} />
                      </span>
                    ) : null}
                  </>
                );
                const style = { "--c": subjectColor(s.subject.id) } as CSSProperties;
                return (
                  <li key={s.id} className={styles.item} style={style}>
                    {s.finished ? (
                      <Link href={`/${locale}/exam/review/${s.id}`} className={styles.itemLink}>
                        {body}
                      </Link>
                    ) : (
                      <div className={styles.itemLink}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))
      )}
    </section>
  );
}
