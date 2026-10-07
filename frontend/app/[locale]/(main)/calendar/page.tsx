"use client";

import { useState } from "react";
import Link from "next/link";
import { FaCalendarCheck, FaCheckCircle, FaChevronLeft, FaChevronRight, FaBookOpen } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";

import {
  addMonths,
  formatDay,
  formatMonth,
  isoWeekday,
  monthGrid,
  toISODate,
  weekdayName,
  type IsoWeekday,
} from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { subjectColor } from "@/lib/subjects";
import { useApi } from "@/lib/useApi";
import type { CalendarData } from "@/lib/types";
import { ChildPicker, useStudentScope } from "../components/ChildPicker";
import { useMe } from "../components/MeContext";
import { ErrorBox, PageHeader, SectionHeader, SubjectBadge } from "../components/ui/Parts";
import ui from "../components/ui/ui.module.scss";

const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}

function Dot({ color }: { color: string }) {
  return <span className={ui.dot} style={{ background: color }} />;
}

/** Month view of lessons, homework due dates and scheduled exams, with the chosen day's agenda. */
export default function CalendarPage() {
  const t = useTranslations("App");
  const locale = useLocale();
  const me = useMe();
  const isTeacher = me?.role === "teacher";

  const [chosenChild, setChosenChild] = useState<number | undefined>();
  const scope = useStudentScope(chosenChild);

  const today = toISODate(new Date());
  const [month, setMonth] = useState(() => addMonths(new Date(), 0));
  const [selected, setSelected] = useState(today);

  const weeks = monthGrid(month);
  const start = toISODate(weeks[0][0]);
  const end = toISODate(weeks[weeks.length - 1][6]);

  const { data, error, reload } = useApi<CalendarData>(scope.ready ? "/calendar/" : null, {
    start,
    end,
    student_id: scope.studentId,
  });

  const lessonsByWeekday = groupBy(data?.lessons ?? [], (lesson) => lesson.weekday);
  const homeworkByDay = groupBy(data?.homework ?? [], (item) => item.due_date);
  const examsByDay = groupBy(data?.exams ?? [], (exam) => exam.scheduled_for);

  const selectedDate = new Date(`${selected}T12:00:00`);
  const dayLessons = lessonsByWeekday.get(isoWeekday(selectedDate)) ?? [];
  const dayHomework = homeworkByDay.get(selected) ?? [];
  const dayExams = examsByDay.get(selected) ?? [];

  const goToday = () => {
    setMonth(addMonths(new Date(), 0));
    setSelected(today);
  };

  return (
    <div className={ui.page}>
      <PageHeader icon={<FaCalendarCheck />} title={t("calendar.title")} />
      <ChildPicker childList={scope.children} value={scope.studentId} onChange={setChosenChild} />

      {error && !data ? <ErrorBox error={error} onRetry={reload} /> : null}

      <div className={ui.split}>
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
            <button type="button" className={ui.monthTitle} onClick={goToday}>
              {formatMonth(month, t)}
            </button>
            <button
              type="button"
              className={ui.iconBtn}
              aria-label={t("web.nextMonth")}
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <FaChevronRight />
            </button>
          </div>

          <div className={ui.weekGrid}>
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className={ui.weekday}>
                {weekdayName(weekday, t, true)}
              </div>
            ))}
            {weeks.flat().map((day) => {
              const iso = toISODate(day);
              const inMonth = day.getMonth() === month.getMonth();
              const isSelected = iso === selected;
              const hasExam = examsByDay.has(iso);
              const hasHomework = homeworkByDay.has(iso);
              const hasLessons = lessonsByWeekday.has(isoWeekday(day));

              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(iso)}
                  className={[
                    ui.day,
                    inMonth ? "" : ui.dayOutside,
                    iso === today ? ui.dayToday : "",
                    isSelected ? ui.daySelected : "",
                  ].join(" ")}
                >
                  {day.getDate()}
                  <span className={ui.dots}>
                    {hasExam ? <Dot color={isSelected ? "#fff" : "var(--accent)"} /> : null}
                    {hasHomework ? <Dot color={isSelected ? "#fff" : "var(--warn)"} /> : null}
                    {!hasExam && !hasHomework && hasLessons && inMonth ? (
                      <Dot color={isSelected ? "rgba(255,255,255,0.6)" : "var(--border-strong)"} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={ui.legend}>
            <span className={ui.row} style={{ gap: 6 }}>
              <Dot color="var(--accent)" /> {t("calendar.exams")}
            </span>
            <span className={ui.row} style={{ gap: 6 }}>
              <Dot color="var(--warn)" /> {t("calendar.homework")}
            </span>
          </div>
        </section>

        <section className={ui.stack}>
          <h2 className={ui.sectionTitle} style={{ fontSize: 18 }}>
            {selected === today ? t("common.today") : weekdayName(isoWeekday(selectedDate), t)}, {formatDay(selected, t)}
          </h2>

          {dayExams.length === 0 && dayHomework.length === 0 && dayLessons.length === 0 ? (
            <div className={ui.card}>
              <span className={ui.muted}>{t("calendar.nothing")}</span>
            </div>
          ) : null}

          {dayExams.length ? (
            <>
              <SectionHeader title={t("calendar.exams")} />
              {dayExams.map((exam) => (
                <Link
                  key={exam.id}
                  href={`/${locale}/exam`}
                  className={`${ui.card} ${ui.clickable} ${ui.agenda}`}
                  style={{ borderLeftColor: "var(--accent)", gap: 6 }}
                >
                  <SubjectBadge subjectId={exam.subject_id} label={getLocalizedValue(exam.subject, locale)} />
                  <span className={`${ui.strong} ${ui.wrap}`}>{getLocalizedValue(exam.title, locale)}</span>
                  <span className={ui.muted}>{t("common.minutes", { count: exam.duration })}</span>
                </Link>
              ))}
            </>
          ) : null}

          {dayHomework.length ? (
            <>
              <SectionHeader title={t("calendar.homework")} />
              {dayHomework.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/exercise?date=${item.date}`}
                  className={`${ui.card} ${ui.clickable} ${ui.agenda}`}
                  style={{ borderLeftColor: item.completed ? "var(--ok)" : "var(--warn)" }}
                >
                  <div className={ui.row}>
                    {item.completed ? (
                      <FaCheckCircle color="var(--ok)" size={18} />
                    ) : (
                      <FaBookOpen color="var(--warn)" size={18} />
                    )}
                    <div className={ui.grow}>
                      <div className={`${ui.strong} ${ui.wrap}`}>{item.title}</div>
                      {item.subject ? (
                        <div className={ui.muted}>{getLocalizedValue(item.subject, locale)}</div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </>
          ) : null}

          {dayLessons.length ? (
            <>
              <SectionHeader title={t("calendar.lessons")} />
              <div className={ui.card} style={{ gap: 0, paddingTop: 6, paddingBottom: 6 }}>
                {dayLessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={ui.row}
                    style={{ padding: "10px 0", borderTop: index ? "1px solid var(--border-medium)" : undefined }}
                  >
                    <span className={ui.muted} style={{ width: 44 }}>
                      {lesson.start_time}
                    </span>
                    <span
                      style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: subjectColor(lesson.subject_id) }}
                    />
                    <div className={ui.grow}>
                      <div className={ui.strong}>{getLocalizedValue(lesson.subject, locale)}</div>
                      <div className={ui.muted}>
                        {[
                          `${lesson.start_time}–${lesson.end_time}`,
                          lesson.room ? t("schedule.room", { room: lesson.room }) : null,
                          isTeacher ? `${t("common.grade")} ${lesson.grade}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
