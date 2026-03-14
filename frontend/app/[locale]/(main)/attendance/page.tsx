// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import styles from "./assignments.module.scss";
// import api from "@/interceptors";
// import { Lesson, TodayAttendanceResponse } from "./interface";
// import { AxiosError } from "axios";
// import { FaClipboardCheck } from "react-icons/fa";
// import { Spin } from "antd";
// import { useTranslations } from "next-intl";

// export default function TeacherTodayAttendance() {
//   const t = useTranslations("Attendance");

//   const [loading, setLoading] = useState<boolean>(true);
//   const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
//   const [date, setDate] = useState<string>("");
//   const [weekday, setWeekday] = useState<number>(0);
//   const [lessons, setLessons] = useState<Lesson[]>([]);
//   const [presence, setPresence] = useState<Record<string, boolean>>({});
//   const [forbiden, setForbiden] = useState<boolean>(false);

//   const load = async () => {
//     try {
//       setLoading(true);
//       setForbiden(false);

//       const res = await api.get<TodayAttendanceResponse>(
//         "/teacher/attendance/today-lessons/"
//       );

//       const data = res.data;

//       setDate(data.date);
//       setWeekday(data.weekday);
//       setLessons(data.lessons ?? []);

//       const seed: Record<string, boolean> = {};
//       for (const l of data.lessons ?? []) {
//         for (const s of l.students ?? []) {
//           seed[`${l.lesson_id}:${s.id}`] = s.is_present;
//         }
//       }
//       setPresence(seed);
//     } 
//     catch (error: unknown) {
//       const err = error as AxiosError;

//       if (err.response?.status === 403) {
//         setForbiden(true);
//         setLessons([]);
//         setPresence({});
//         return;
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   const setStudentPresence = (lessonId: number, studentId: number, isPresent: boolean) => {
//     setPresence((prev) => ({ ...prev, [`${lessonId}:${studentId}`]: isPresent }));
//   };

//   const getStudentPresence = (lessonId: number, studentId: number, fallback: boolean) => {
//     const key = `${lessonId}:${studentId}`;
//     return key in presence ? presence[key] : fallback;
//   };

//   const markAll = (lessonId: number, isPresent: boolean) => {
//     setPresence((prev) => {
//       const next = { ...prev };
//       const lesson = lessons.find((l) => l.lesson_id === lessonId);
//       if (!lesson) return prev;

//       for (const s of lesson.students) {
//         next[`${lessonId}:${s.id}`] = isPresent;
//       }
//       return next;
//     });
//   };

//   const saveLesson = async (lessonId: number) => {
//     const lesson = lessons.find((l) => l.lesson_id === lessonId);
//     if (!lesson) return;

//     const payload = {
//       lesson_id: lessonId,
//       date,
//       attendance: lesson.students.map((s) => ({
//         student_id: s.id,
//         is_present: getStudentPresence(lessonId, s.id, s.is_present),
//       })),
//     };

//     try {
//       setSavingLessonId(lessonId);
//       await api.post("/teacher/attendance/mark/", payload);
//       await load();
//     } 
//     finally {
//       setSavingLessonId(null);
//     }
//   };

//   const weekdayLabel = useMemo(() => {
//     const map: Record<number, string> = {
//       1: t("weekdays.mon"),
//       2: t("weekdays.tue"),
//       3: t("weekdays.wed"),
//       4: t("weekdays.thu"),
//       5: t("weekdays.fri"),
//       6: t("weekdays.sat"),
//       7: t("weekdays.sun"),
//     };
//     return map[weekday] ?? "";
//   }, [weekday, t]);

//   if (loading) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.shell}>
//           <div className={styles.loadingWrap}>
//             <Spin size="large" />
//             <div className={styles.loadingText}>{t("loading")}</div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (forbiden) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.shell}>
//           <div className={styles.forbiddenCard}>
//             <div className={styles.forbiddenTitle}>{t("accessDeniedTitle")}</div>
//             <div className={styles.forbiddenSub}>{t("teachersOnly")}</div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.page}>
//       <div className={styles.topBar}>
//         <div className={styles.titleBlock}>
//           <div className={styles.WrapperOfMainCaptionAndIcon}>
//             <span className={styles.headerIcon}>
//               <FaClipboardCheck className={styles.navIcon} />
//             </span>
//             <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//           </div>
//           <p className={styles.subtitle}>
//             {date ? `${weekdayLabel} • ${date}` : t("today")}
//           </p>
//         </div>

//         <div className={styles.controlsRight}>
//           <button className={styles.refreshBtn} type="button" onClick={load}>
//             {t("refresh")}
//           </button>
//         </div>
//       </div>

//       <div className={styles.shell}>
//         {!lessons.length ? (
//           <div className={styles.emptyCard}>
//             <div className={styles.emptyTitle}>{t("noLessonsTitle")}</div>
//             <div className={styles.emptySub}>{t("noLessonsSub")}</div>
//           </div>
//         ) : (
//           <div className={styles.subjectList}>
//             {lessons.map((lesson) => (
//               <details key={lesson.lesson_id} className={styles.subjectItem}>
//                 <summary className={styles.subjectSummary}>
//                   <div className={styles.subjectLeft}>
//                     <span className={styles.subjectName} title={lesson.subject_name}>
//                       {lesson.subject_name}
//                     </span>

//                     <span className={styles.badge}>
//                       {lesson.grade_name} {lesson.grade_category_name}
//                     </span>
//                   </div>

//                   <div className={styles.subjectRight}>
//                     <span className={styles.timeChip}>
//                       {lesson.time.start}–{lesson.time.end}
//                     </span>
//                     <span className={styles.chev} aria-hidden>
//                       ▾
//                     </span>
//                   </div>
//                 </summary>

//                 <div className={styles.lessonBody}>
//                   <div className={styles.lessonTopRow}>
//                     <div className={styles.lessonMeta}>
//                       {lesson.room ? (
//                         <span className={styles.roomChip}>
//                           {t("room")} {lesson.room}
//                         </span>
//                       ) : null}

//                       <span className={styles.studentsCount}>
//                         {lesson.students.length} {t("students")}
//                       </span>
//                     </div>

//                     <div className={styles.bulkActions}>
//                       <button
//                         type="button"
//                         className={styles.bulkBtn}
//                         onClick={() => markAll(lesson.lesson_id, true)}
//                       >
//                         {t("markAllPresent")}
//                       </button>
//                       <button
//                         type="button"
//                         className={styles.bulkBtnDanger}
//                         onClick={() => markAll(lesson.lesson_id, false)}
//                       >
//                         {t("markAllAbsent")}
//                       </button>
//                     </div>
//                   </div>

//                   <div className={styles.studentsWrap}>
//                     {lesson.students.map((s, i) => {
//                       const isPresent = getStudentPresence(lesson.lesson_id, s.id, s.is_present);

//                       return (
//                         <div key={s.id} className={styles.studentRow}>
//                           <div className={styles.studentName}><span style={{color: '#4693ff'}} >{i + 1}.</span> {s.name}</div>
//                           <div className={styles.pills} role="group" aria-label="presence">
//                             <button
//                               type="button"
//                               className={`${styles.pill} ${isPresent ? styles.pillActive : ""}`}
//                               onClick={() => setStudentPresence(lesson.lesson_id, s.id, true)}
//                             >
//                               {t("present")}
//                             </button>

//                             <button
//                               type="button"
//                               className={`${styles.pill} ${!isPresent ? styles.pillDanger : ""}`}
//                               onClick={() => setStudentPresence(lesson.lesson_id, s.id, false)}
//                             >
//                               {t("absent")}
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>

//                   <div className={styles.saveBar}>
//                     <button
//                       type="button"
//                       className={styles.saveBtn}
//                       onClick={() => saveLesson(lesson.lesson_id)}
//                       disabled={savingLessonId === lesson.lesson_id || !date}
//                     >
//                       {savingLessonId === lesson.lesson_id ? t("saving") : t("saveAttendance")}
//                     </button>
//                   </div>
//                 </div>
//               </details>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }





"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./assignments.module.scss";
import api from "@/interceptors";
import { Lesson, TodayAttendanceResponse } from "./interface";
import { AxiosError } from "axios";
import { FaClipboardCheck } from "react-icons/fa";
import { Spin } from "antd";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

type LocalizedValue = string | Record<string, string> | null | undefined;

function getLocalizedValue(value: LocalizedValue, locale: string) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] || value.ka || value.en || value.ru || "";
}

export default function TeacherTodayAttendance() {
  const t = useTranslations("Attendance");
  const pathname = usePathname();
  const locale = pathname?.split("/")[1] || "en";

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
      1: t("weekdays.mon"),
      2: t("weekdays.tue"),
      3: t("weekdays.wed"),
      4: t("weekdays.thu"),
      5: t("weekdays.fri"),
      6: t("weekdays.sat"),
      7: t("weekdays.sun"),
    };
    return map[weekday] ?? "";
  }, [weekday, t]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
            <div className={styles.loadingText}>{t("loading")}</div>
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
            <div className={styles.forbiddenTitle}>{t("accessDeniedTitle")}</div>
            <div className={styles.forbiddenSub}>{t("teachersOnly")}</div>
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
            <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
          </div>
          <p className={styles.subtitle}>
            {date ? `${weekdayLabel} • ${date}` : t("today")}
          </p>
        </div>

        <div className={styles.controlsRight}>
          <button className={styles.refreshBtn} type="button" onClick={load}>
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className={styles.shell}>
        {!lessons.length ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>{t("noLessonsTitle")}</div>
            <div className={styles.emptySub}>{t("noLessonsSub")}</div>
          </div>
        ) : (
          <div className={styles.subjectList}>
            {lessons.map((lesson) => (
              <details key={lesson.lesson_id} className={styles.subjectItem}>
                <summary className={styles.subjectSummary}>
                  <div className={styles.subjectLeft}>
                    <span
                      className={styles.subjectName}
                      title={getLocalizedValue(lesson.subject_name, locale)}
                    >
                      {getLocalizedValue(lesson.subject_name, locale)}
                    </span>

                    <span className={styles.badge}>
                      {getLocalizedValue(lesson.grade_name, locale)}{" "}
                      {getLocalizedValue(lesson.grade_category_name, locale)}
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
                        <span className={styles.roomChip}>
                          {t("room")} {lesson.room}
                        </span>
                      ) : null}

                      <span className={styles.studentsCount}>
                        {lesson.students.length} {t("students")}
                      </span>
                    </div>

                    <div className={styles.bulkActions}>
                      <button
                        type="button"
                        className={styles.bulkBtn}
                        onClick={() => markAll(lesson.lesson_id, true)}
                      >
                        {t("markAllPresent")}
                      </button>
                      <button
                        type="button"
                        className={styles.bulkBtnDanger}
                        onClick={() => markAll(lesson.lesson_id, false)}
                      >
                        {t("markAllAbsent")}
                      </button>
                    </div>
                  </div>

                  <div className={styles.studentsWrap}>
                    {lesson.students.map((s, i) => {
                      const isPresent = getStudentPresence(
                        lesson.lesson_id,
                        s.id,
                        s.is_present
                      );

                      return (
                        <div key={s.id} className={styles.studentRow}>
                          <div className={styles.studentName}>
                            <span style={{ color: "#4693ff" }}>{i + 1}.</span>{" "}
                            {getLocalizedValue(s.name, locale)}
                          </div>
                          <div className={styles.pills} role="group" aria-label="presence">
                            <button
                              type="button"
                              className={`${styles.pill} ${isPresent ? styles.pillActive : ""}`}
                              onClick={() => setStudentPresence(lesson.lesson_id, s.id, true)}
                            >
                              {t("present")}
                            </button>

                            <button
                              type="button"
                              className={`${styles.pill} ${!isPresent ? styles.pillDanger : ""}`}
                              onClick={() => setStudentPresence(lesson.lesson_id, s.id, false)}
                            >
                              {t("absent")}
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
                      {savingLessonId === lesson.lesson_id ? t("saving") : t("saveAttendance")}
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