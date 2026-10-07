"use client";

import Link from "next/link";
import { FaChevronRight } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";

import { formatRelative } from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { useApi } from "@/lib/useApi";
import type { ExamHistoryItem } from "@/lib/types";
import { Empty, ErrorBox, Loading, SubjectMark, type Tone, Pill } from "../../components/ui/Parts";
import ui from "../../components/ui/ui.module.scss";

/** Finished exams with scores (the student's own, or a parent's child), each opening the answer review. */
export default function ExamResults({ studentId, enabled = true }: { studentId?: number; enabled?: boolean }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const { data, error, loading, reload } = useApi<{ items: ExamHistoryItem[] }>(enabled ? "/exams/history/" : null, {
    student_id: studentId,
  });

  if (!data && (loading || !enabled)) return <Loading />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data?.items.length) return <Empty title={t("exams.noResults")} />;

  return (
    <section className={ui.card} style={{ gap: 0, paddingTop: 6, paddingBottom: 6 }}>
      {data.items.map((item) => {
        const ratio = item.max_score ? item.score / item.max_score : 0;
        const tone: Tone = ratio >= 0.8 ? "ok" : ratio >= 0.5 ? "warn" : "bad";
        const subject = getLocalizedValue(item.subject, locale);

        return (
          <Link key={item.session_id} href={`/${locale}/exam/review/${item.session_id}`} className={ui.rowLink}>
            <SubjectMark subjectId={item.subject_id} label={subject || item.title} size={44} />
            <div className={ui.grow}>
              <div className={ui.strong}>{item.title}</div>
              <div className={ui.muted}>
                {subject ? `${subject} · ` : ""}
                {t("exams.correctOf", { correct: item.correct, total: item.total_questions })}
                {item.submitted_at ? ` · ${formatRelative(item.submitted_at, t)}` : ""}
                {item.timed_out ? ` · ${t("exams.timedOut")}` : ""}
              </div>
            </div>
            <Pill tone={tone}>{t("exams.scoreOf", { score: item.score, max: item.max_score })}</Pill>
            <FaChevronRight color="var(--text-muted)" size={12} />
          </Link>
        );
      })}
    </section>
  );
}
