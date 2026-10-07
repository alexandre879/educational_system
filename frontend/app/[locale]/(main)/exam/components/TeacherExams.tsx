"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FaCalendarAlt, FaClock, FaFileAlt, FaPlus, FaUsers } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";

import { formatDay } from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { useApi } from "@/lib/useApi";
import type { TeacherExam } from "@/lib/types";
import { Empty, ErrorBox, Loading, PageHeader, Pill, SubjectBadge } from "../../components/ui/Parts";
import ui from "../../components/ui/ui.module.scss";

/** Exams in the subjects a teacher teaches, with how the class did so far. */
export default function TeacherExams() {
  const t = useTranslations("App");
  const locale = useLocale();
  const { data, error, loading, reload } = useApi<{ items: TeacherExam[] }>("/teacher/exams/");

  const createButton = (
    <Link href={`/${locale}/exam/new`} className={`${ui.btn} ${ui.btnPrimary}`}>
      <FaPlus aria-hidden /> {t("teacherExams.create")}
    </Link>
  );

  return (
    <div className={ui.page}>
      <PageHeader icon={<FaFileAlt />} title={t("teacherExams.title")} actions={createButton} />

      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <Empty title={t("teacherExams.empty")} message={t("teacherExams.emptyHint")} action={createButton} />
      ) : (
        <div className={ui.grid2}>
          {data.items.map((exam) => (
            <article key={exam.id} className={ui.card} style={{ gap: 10 }}>
              <div className={ui.chips} style={{ gap: 6 }}>
                <SubjectBadge subjectId={exam.subject_id} label={getLocalizedValue(exam.subject, locale)} />
                <Pill>
                  {`${t("common.grade")} ${exam.grade.name} ${getLocalizedValue(exam.grade.category_name, locale)}`.trim()}
                </Pill>
              </div>
              <div className={`${ui.strong} ${ui.wrap}`} style={{ fontSize: 16 }}>
                {getLocalizedValue(exam.title, locale)}
              </div>
              <div className={ui.chips} style={{ gap: 14 }}>
                <Meta icon={<FaFileAlt />} label={t("teacherExams.questions", { count: exam.questions_count })} />
                <Meta icon={<FaClock />} label={t("common.minutes", { count: exam.duration })} />
                {exam.scheduled_for ? <Meta icon={<FaCalendarAlt />} label={formatDay(exam.scheduled_for, t)} /> : null}
              </div>
              <div className={ui.divider} />
              <div className={ui.row} style={{ justifyContent: "space-between" }}>
                <Meta icon={<FaUsers />} label={t("teacherExams.submissions", { count: exam.submissions })} />
                {exam.average_score !== null ? (
                  <span className={ui.strong} style={{ color: "var(--primary-blue)" }}>
                    {t("teacherExams.average", { score: exam.average_score, max: exam.max_score })}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className={ui.muted} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{icon}</span>
      {label}
    </span>
  );
}
