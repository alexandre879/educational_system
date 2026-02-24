"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./assignments.module.scss";
import api from "@/interceptors";
import { Lesson, TodayAttendanceResponse } from "./interface";
import { AxiosError } from "axios";
import { FaClipboardCheck } from "react-icons/fa";
import { Spin } from "antd";

export default function TeacherTodayAttendance() {
  const [loading, setLoading] = useState<boolean>(true);
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
  const [date, setDate] = useState<string>("");
  const [weekday, setWeekday] = useState<number>(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [forbiden, setForbiden] = useState<boolean>(false);

  const load = async () => {
    try {
      setLoading(true);
      setForbiden(false);

      const res = await api.get<TodayAttendanceResponse>(
        "/teacher/attendance/today-lessons/"
      );

      const data = res.data;

      setDate(data.date);
      setWeekday(data.weekday);
      setLessons(data.lessons ?? []);

      const seed: Record<string, boolean> = {};
      for (const l of data.lessons ?? []) {
        for (const s of l.students ?? []) {
          seed[`${l.lesson_id}:${s.id}`] = s.is_present;
        }
      }
      setPresence(seed);
    } catch (error: unknown) {
      const err = error as AxiosError;

      if (err.response?.status === 403) {
        setForbiden(true);
        setLessons([]);
        setPresence({});
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStudentPresence = (lessonId: number, studentId: number, isPresent: boolean) => {
    setPresence((prev) => ({ ...prev, [`${lessonId}:${studentId}`]: isPresent }));
  };

  const getStudentPresence = (lessonId: number, studentId: number, fallback: boolean) => {
    const key = `${lessonId}:${studentId}`;
    return key in presence ? presence[key] : fallback;
  };

  const markAll = (lessonId: number, isPresent: boolean) => {
    setPresence((prev) => {
      const next = { ...prev };
      const lesson = lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return prev;

      for (const s of lesson.students) {
        next[`${lessonId}:${s.id}`] = isPresent;
      }
      return next;
    });
  };

  const saveLesson = async (lessonId: number) => {
    const lesson = lessons.find((l) => l.lesson_id === lessonId);
    if (!lesson) return;

    const payload = {
      lesson_id: lessonId,
      date,
      attendance: lesson.students.map((s) => ({
        student_id: s.id,
        is_present: getStudentPresence(lessonId, s.id, s.is_present),
      })),
    };

    try {
      setSavingLessonId(lessonId);
      await api.post("/teacher/attendance/mark/", payload);
      await load();
    } finally {
      setSavingLessonId(null);
    }
  };

  const weekdayLabel = useMemo(() => {
    const map: Record<number, string> = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
      7: "Sunday",
    };
    return map[weekday] ?? "";
  }, [weekday]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
            <div className={styles.loadingText}>Loading attendance…</div>
          </div>
        </div>
      </div>
    );
  }

  if (forbiden) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.forbiddenCard}>
            <div className={styles.forbiddenTitle}>Access denied</div>
            <div className={styles.forbiddenSub}>This page is available for teachers only.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.titleBlock}>
          <div className={styles.WrapperOfMainCaptionAndIcon}>
            <span className={styles.headerIcon}>
              <FaClipboardCheck className={styles.navIcon} />
            </span>
            <h1 className={styles.pageMainCaptionStyle}>Attendance</h1>
          </div>
          <p className={styles.subtitle}>
            {date ? `${weekdayLabel} • ${date}` : "Today"}
          </p>
        </div>

        <div className={styles.controlsRight}>
          <button className={styles.refreshBtn} type="button" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.shell}>
        {!lessons.length ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No lessons scheduled for today.</div>
            <div className={styles.emptySub}>When a lesson appears, you’ll be able to mark attendance here.</div>
          </div>
        ) : (
          <div className={styles.subjectList}>
            {lessons.map((lesson) => (
              <details key={lesson.lesson_id} className={styles.subjectItem}>
                <summary className={styles.subjectSummary}>
                  <div className={styles.subjectLeft}>
                    <span className={styles.subjectName} title={lesson.subject_name}>
                      {lesson.subject_name}
                    </span>

                    <span className={styles.badge}>
                      {lesson.grade_name} {lesson.grade_category_name}
                    </span>
                  </div>

                  <div className={styles.subjectRight}>
                    <span className={styles.timeChip}>
                      {lesson.time.start}–{lesson.time.end}
                    </span>
                    <span className={styles.chev} aria-hidden>
                      ▾
                    </span>
                  </div>
                </summary>

                <div className={styles.lessonBody}>
                  <div className={styles.lessonTopRow}>
                    <div className={styles.lessonMeta}>
                      {lesson.room ? (
                        <span className={styles.roomChip}>Room {lesson.room}</span>
                      ) : null}

                      <span className={styles.studentsCount}>
                        {lesson.students.length} students
                      </span>
                    </div>

                    <div className={styles.bulkActions}>
                      <button
                        type="button"
                        className={styles.bulkBtn}
                        onClick={() => markAll(lesson.lesson_id, true)}
                      >
                        Mark all Present
                      </button>
                      <button
                        type="button"
                        className={styles.bulkBtnDanger}
                        onClick={() => markAll(lesson.lesson_id, false)}
                      >
                        Mark all Absent
                      </button>
                    </div>
                  </div>

                  <div className={styles.studentsWrap}>
                    {lesson.students.map((s) => {
                      const isPresent = getStudentPresence(lesson.lesson_id, s.id, s.is_present);

                      return (
                        <div key={s.id} className={styles.studentRow}>
                          <div className={styles.studentName}>{s.name}</div>

                          <div className={styles.pills} role="group" aria-label="presence">
                            <button
                              type="button"
                              className={`${styles.pill} ${isPresent ? styles.pillActive : ""}`}
                              onClick={() => setStudentPresence(lesson.lesson_id, s.id, true)}
                            >
                              Present
                            </button>

                            <button
                              type="button"
                              className={`${styles.pill} ${!isPresent ? styles.pillDanger : ""}`}
                              onClick={() => setStudentPresence(lesson.lesson_id, s.id, false)}
                            >
                              Absent
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.saveBar}>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={() => saveLesson(lesson.lesson_id)}
                      disabled={savingLessonId === lesson.lesson_id || !date}
                    >
                      {savingLessonId === lesson.lesson_id ? "Saving..." : "Save attendance"}
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}