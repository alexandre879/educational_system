"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar } from "@mui/material";
import { FaChevronLeft, FaChevronRight, FaUserGraduate } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";

import {
  addMonths,
  formatDay,
  formatMonth,
  formatRelative,
  isoWeekday,
  monthGrid,
  toISODate,
  toISOMonth,
  weekdayName,
  type IsoWeekday,
} from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { fullName } from "@/lib/subjects";
import { useApi } from "@/lib/useApi";
import type { AttendanceHistory, ExamHistoryItem, StudentMarks } from "@/lib/types";
import { useStudentScope } from "../../components/ChildPicker";
import { AverageBadge } from "../../components/ui/Marks";
import {
  ErrorBox,
  Loading,
  PageHeader,
  Pill,
  SectionHeader,
  SubjectBadge,
  SubjectMark,
} from "../../components/ui/Parts";
import ui from "../../components/ui/ui.module.scss";

const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Everything a parent wants to know about one child: attendance by month, marks and exam results. */
export default function ChildPage() {
  const { id } = useParams<{ id: string }>();
  const childId = Number(id);
  const t = useTranslations("App");
  const locale = useLocale();

  const scope = useStudentScope(childId);
  const child = scope.children.find((c) => c.id === childId);

  const [month, setMonth] = useState(() => addMonths(new Date(), 0));
  const monthKey = toISOMonth(month);

  const attendance = useApi<AttendanceHistory>("/attendance/history/", { month: monthKey, student_id: childId });
  const marks = useApi<StudentMarks>("/marks/", { student_id: childId });
  const exams = useApi<{ items: ExamHistoryItem[] }>("/exams/history/", { student_id: childId });

  const name = child ? fullName(child) : marks.data?.student.name ?? "";
  const subjectsWithMarks = (marks.data?.subjects ?? []).filter((s) => s.marks.length > 0);

  return (
    <div className={`${ui.page} ${ui.narrow}`}>
      <PageHeader icon={<FaUserGraduate />} title={name || t("home.childDetails")} backHref={`/${locale}/home`} />

      {child ? (
        <section className={ui.card}>
          <div className={ui.row}>
            <Avatar src={mediaUrl(child.profilePic)} alt={name} sx={{ width: 56, height: 56 }} />
            <div className={ui.grow}>
              <div className={ui.strong} style={{ fontSize: 18 }}>
                {name}
              </div>
              {child.grade ? (
                <div className={ui.muted}>
                  {`${t("common.grade")} ${child.grade.name} ${getLocalizedValue(child.grade.category_name, locale)}`.trim()}
                </div>
              ) : null}
            </div>
            <Pill tone="warn">★ {child.points}</Pill>
          </div>
          <div className={ui.statRow}>
            <Stat label={t("home.averageMark")} value={child.average_mark === null ? "—" : child.average_mark.toFixed(1)} />
            <Stat label={t("home.attendanceRate")} value={child.attendance_rate === null ? "—" : `${child.attendance_rate}%`} />
            <Stat label={t("home.pendingHomework")} value={String(child.pending_homework)} />
          </div>
        </section>
      ) : null}

      <SectionHeader title={t("child.attendance")} />
      <section className={ui.card}>
        <div className={ui.monthHeader}>
          <button
            type="button"
            className={ui.iconBtn}
            aria-label={t("web.previousMonth")}
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <FaChevronLeft />
          </button>
          <span className={ui.monthTitle}>{formatMonth(month, t)}</span>
          <button
            type="button"
            className={ui.iconBtn}
            aria-label={t("web.nextMonth")}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <FaChevronRight />
          </button>
        </div>

        {attendance.loading && !attendance.data ? (
          <Loading />
        ) : attendance.error ? (
          <ErrorBox error={attendance.error} onRetry={attendance.reload} />
        ) : attendance.data ? (
          <AttendanceMonth month={month} history={attendance.data} />
        ) : null}
      </section>

      <SectionHeader
        title={t("child.marks")}
        action={
          <Link className={ui.sectionAction} href={`/${locale}/marks?student=${childId}`}>
            {t("child.viewAll")}
          </Link>
        }
      />
      <section className={ui.card}>
        {marks.loading && !marks.data ? (
          <Loading />
        ) : marks.error ? (
          <ErrorBox error={marks.error} onRetry={marks.reload} />
        ) : subjectsWithMarks.length === 0 ? (
          <span className={ui.muted}>{t("marks.noMarks")}</span>
        ) : (
          subjectsWithMarks.map((subject) => {
            const subjectName = getLocalizedValue(subject.subject, locale);
            return (
              <div key={subject.subject_id} className={ui.row}>
                <SubjectMark subjectId={subject.subject_id} label={subjectName} size={36} />
                <span className={`${ui.strong} ${ui.grow}`}>{subjectName}</span>
                <AverageBadge value={subject.average} />
              </div>
            );
          })
        )}
      </section>

      <SectionHeader title={t("child.exams")} />
      <section className={ui.card} style={{ gap: 0 }}>
        {exams.loading && !exams.data ? (
          <Loading />
        ) : exams.error ? (
          <ErrorBox error={exams.error} onRetry={exams.reload} />
        ) : !exams.data?.items.length ? (
          <span className={ui.muted}>{t("child.noExams")}</span>
        ) : (
          exams.data.items.slice(0, 6).map((exam) => (
            <Link key={exam.session_id} href={`/${locale}/exam/review/${exam.session_id}`} className={ui.rowLink}>
              <div className={ui.grow}>
                <div className={ui.strong}>{exam.title}</div>
                <div className={ui.muted}>
                  {getLocalizedValue(exam.subject, locale)}
                  {exam.submitted_at ? ` · ${formatRelative(exam.submitted_at, t)}` : ""}
                </div>
              </div>
              <span className={ui.strong} style={{ color: "var(--primary-blue)" }}>
                {t("exams.scoreOf", { score: exam.score, max: exam.max_score })}
              </span>
              <FaChevronRight color="var(--text-muted)" size={12} />
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={ui.statTile}>
      <span className={ui.statValue}>{value}</span>
      <span className={ui.statLabel}>{label}</span>
    </div>
  );
}

/** Month grid: green days fully attended, red days with an absence; absences listed below. */
function AttendanceMonth({ month, history }: { month: Date; history: AttendanceHistory }) {
  const t = useTranslations("App");
  const locale = useLocale();

  if (history.records.length === 0) {
    return <span className={ui.muted}>{t("child.noAttendance")}</span>;
  }

  const byDay = new Map<string, boolean>();
  for (const record of history.records) {
    byDay.set(record.date, (byDay.get(record.date) ?? true) && record.is_present);
  }
  const absences = history.records.filter((record) => !record.is_present);

  return (
    <>
      <div className={ui.chips}>
        <Pill tone="ok">{t("child.presentCount", { count: history.summary.present })}</Pill>
        <Pill tone="bad">{t("child.absentCount", { count: history.summary.absent })}</Pill>
        {history.summary.rate !== null ? (
          <Pill tone="primary">{t("child.attendanceRate", { rate: history.summary.rate })}</Pill>
        ) : null}
      </div>

      <div className={ui.weekGrid}>
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className={ui.weekday}>
            {weekdayName(weekday, t, true)}
          </div>
        ))}
        {monthGrid(month)
          .flat()
          .map((day) => {
            const iso = toISODate(day);
            const status = byDay.get(iso);
            const inMonth = day.getMonth() === month.getMonth();
            return (
              <div
                key={iso}
                className={`${ui.day} ${ui.dayStatic} ${inMonth ? "" : ui.dayOutside}`}
                style={
                  status === undefined
                    ? { color: "var(--text-muted)", fontWeight: 400 }
                    : {
                        background: status ? "var(--ok-muted)" : "var(--bad-muted)",
                        color: status ? "var(--ok)" : "var(--bad)",
                      }
                }
              >
                {day.getDate()}
              </div>
            );
          })}
      </div>

      {absences.map((record) => (
        <div key={`${record.date}-${record.lesson_id}`} className={ui.row}>
          <span className={ui.muted} style={{ width: 96 }}>
            {weekdayName(isoWeekday(new Date(`${record.date}T12:00:00`)), t, true)}, {formatDay(record.date, t)}
          </span>
          <div className={ui.grow}>
            <SubjectBadge subjectId={record.subject_id} label={getLocalizedValue(record.subject, locale)} />
          </div>
          <span className={ui.faint} style={{ color: "var(--bad)" }}>
            {record.start_time}
          </span>
        </div>
      ))}
    </>
  );
}
