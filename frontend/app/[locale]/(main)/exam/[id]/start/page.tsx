// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import styles from "./styles.module.scss";
// import api from "@/interceptors";
// import { useParams, useRouter, usePathname } from "next/navigation";
// import {
//   ExamSessionData,
//   ExamSessionEndResponse,
//   OptionData,
// } from "../../interface";
// import { AxiosError, AxiosResponse } from "axios";
// import { useTranslations } from "next-intl";

// function isExamSessionData(
//   data: ExamSessionData | ExamSessionEndResponse
// ): data is ExamSessionData {
//   return (data as ExamSessionData).current_question !== undefined;
// }

// function isExamSessionEndResponse(
//   data: ExamSessionData | ExamSessionEndResponse
// ): data is ExamSessionEndResponse {
//   return (data as ExamSessionEndResponse).final_score !== undefined;
// }

// function formatTime(ms: number) {
//   const total = Math.floor(ms / 1000);
//   const m = Math.floor(total / 60);
//   const s = total % 60;
//   return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
// }

// function getLocalizedValue(
//   value: string | Record<string, string> | null | undefined,
//   lang: string
// ): string {
//   if (!value) return "";
//   if (typeof value === "string") return value;
//   return value[lang] || value.ka || value.en || value.ru || "";
// }

// function getOptionLabel(index: number, lang: string): string {
//   const alphabets: Record<string, string[]> = {
//     en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
//     ka: ["ა", "ბ", "გ", "დ", "ე", "ვ", "ზ", "თ", "ი", "კ"],
//     ru: ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "К"],
//   };

//   const letters = alphabets[lang] || alphabets.en;
//   return letters[index] || String(index + 1);
// }

// type WithEndsAt = { ends_at?: string | null };
// type WithExamLanguage = { exam_language?: string };
// type WithLocalizedSubject = {
//   subject?: string | Record<string, string> | null;
// };

// export default function SpecificExam() {
//   const t = useTranslations("SpecificExam");

//   const { id: ExamId } = useParams();
//   const router = useRouter();
//   const pathname = usePathname();

//   const locale = useMemo(() => {
//     const seg = (pathname ?? "").split("/")[1];
//     return seg || "en";
//   }, [pathname]);

//   const [data, setData] = useState<
//     ExamSessionData | ExamSessionEndResponse | null
//   >(null);
//   const [loading, setLoading] = useState(true);

//   const [timeLeftMs, setTimeLeftMs] = useState(0);
//   const [locked, setLocked] = useState(false);
//   const [endedByTimeout, setEndedByTimeout] = useState(false);

//   const intervalRef = useRef<number | null>(null);
//   const finishingRef = useRef(false);

//   const endsAt = useMemo(() => {
//     if (!data) return null;
//     const maybe = data as unknown as WithEndsAt;
//     return maybe.ends_at ?? null;
//   }, [data]);

//   const examLanguage = useMemo(() => {
//     if (!data) return locale;
//     const maybe = data as unknown as WithExamLanguage;
//     return maybe.exam_language || locale;
//   }, [data, locale]);

//   useEffect(() => {
//     setLoading(true);

//     api
//       .post<ExamSessionData | ExamSessionEndResponse>(
//         `exams/${ExamId}/start_or_resume/`
//       )
//       .then((res: AxiosResponse<ExamSessionData | ExamSessionEndResponse>) => {
//         setData(res.data);
//       })
//       .catch((error: AxiosError) => {
//         if (error.response?.status === 401) return router.push(`/${locale}/login`);
//         if (error.response?.status === 403) return router.push(`/${locale}/exam`);
//         if (error.response?.status === 404) return router.push(`/${locale}/exam`);
//         if (error.response?.status === 400) {
//           alert(t("alreadyCompleted"));
//           return router.push(`/${locale}/exam`);
//         }
//       })
//       .finally(() => setLoading(false));
//   }, [ExamId, router, locale, t]);

//   const finishSessionDueToTimeout = useCallback(async () => {
//     if (finishingRef.current) return;
//     finishingRef.current = true;

//     try {
//       setEndedByTimeout(true);
//       setLocked(true);
//       setLoading(true);

//       const res = await api.post<ExamSessionData | ExamSessionEndResponse>(
//         `exams/${ExamId}/start_or_resume/`
//       );
//       setData(res.data);
//     } 
//     catch {
//       alert(t("timeUpEnded"));
//       router.push(`/${locale}/exam`);
//     } finally {
//       setLoading(false);
//     }
//   }, [ExamId, router, locale, t]);

//   useEffect(() => {
//     if (intervalRef.current) {
//       window.clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }

//     finishingRef.current = false;

//     if (!endsAt) return;

//     const tick = () => {
//       const left = new Date(endsAt).getTime() - Date.now();
//       const safe = Math.max(0, left);
//       setTimeLeftMs(safe);

//       if (left <= 0) {
//         setLocked(true);

//         if (intervalRef.current) {
//           window.clearInterval(intervalRef.current);
//           intervalRef.current = null;
//         }

//         finishSessionDueToTimeout();
//         return;
//       }

//       setLocked(false);
//     };

//     tick();
//     intervalRef.current = window.setInterval(tick, 250);

//     return () => {
//       if (intervalRef.current) {
//         window.clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//     };
//   }, [endsAt, finishSessionDueToTimeout]);

//   const onAnswerSubmit = async (
//     session_id: number,
//     question_id: number,
//     option_id: number
//   ) => {
//     if (locked) return;

//     try {
//       setLoading(true);

//       const res = await api.post<ExamSessionData | ExamSessionEndResponse>(
//         `sessions/${session_id}/answer/`,
//         {
//           question_id,
//           option_id,
//         }
//       );

//       setData(res.data);
//     }
//     catch (err: unknown) {
//       if (err instanceof AxiosError && err.response?.status === 403) {
//         setLocked(true);
//         setEndedByTimeout(true);
//         await finishSessionDueToTimeout();
//         return;
//       }

//       console.log(err);
//     }
//     finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className={styles.loaderWrapper}>
//         <div className={styles.loader} />
//       </div>
//     );
//   }

//   if (data && isExamSessionData(data)) {
//     const questionText = getLocalizedValue(
//       data.current_question.text,
//       examLanguage
//     );

//     const subjectTitle = getLocalizedValue(
//       (data as unknown as WithLocalizedSubject).subject,
//       examLanguage
//     );

//     return (
//       <div className={styles.examMainContainer}>
//         <div className={styles.examCard}>
//           <div className={styles.examHeader}>
//             <div className={styles.examTitle}>
//               <h1 title={subjectTitle}>{subjectTitle}</h1>
//               <span className={styles.examBadge}>{t("badgeExam")}</span>
//             </div>

//             {endsAt && (
//               <div
//                 className={`${styles.timer} ${timeLeftMs <= 60_000 ? styles.timerDanger : ""
//                   }`}
//               >
//                 <span>⏳</span>
//                 <span>{formatTime(timeLeftMs)}</span>
//               </div>
//             )}
//           </div>

//           <h2 className={styles.questionText}>{questionText}</h2>

//           <ul className={styles.optionsList}>
//             {data.current_question.options.map(
//               (option: OptionData, index: number) => {
//                 const optionTitle = getLocalizedValue(
//                   option.title,
//                   examLanguage
//                 );

//                 return (
//                   <li
//                     key={option.id}
//                     className={`${styles.specificQuestionWrapper} ${locked ? styles.locked : ""
//                       }`}
//                     onClick={() =>
//                       !locked &&
//                       onAnswerSubmit(
//                         data.session_id,
//                         data.current_question.id,
//                         option.id
//                       )
//                     }
//                   >
//                     <span className={styles.optionIndex}>
//                       {`${getOptionLabel(index, examLanguage)})`}
//                     </span>

//                     <button
//                       type="button"
//                       className={styles.optionButton}
//                       disabled={locked}
//                     >
//                       {optionTitle}
//                     </button>
//                   </li>
//                 );
//               }
//             )}
//           </ul>

//           <div className={styles.progress}>
//             <span>{t("questionLabel")}</span>
//             <span>
//               {data.current_index + 1} / {data.len_questions}
//             </span>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (data && isExamSessionEndResponse(data)) {
//     return (
//       <div className={styles.finalExamContainer}>
//         <div className={styles.finalHeader}>
//           {endedByTimeout ? t("finalTimeUpTitle") : t("finalCompletedTitle")}
//         </div>

//         <div className={styles.finalScore}>
//           {t("scoreLabel")}: {data.final_score}
//         </div>
//         <div className={styles.finalTotal}>
//           {t("totalQuestionsLabel")}: {data.total_questions}
//         </div>

//         <div className={styles.finalMessage}>
//           {endedByTimeout
//             ? t("finalTimeUpMessage")
//             : t("finalCompletedMessage")}
//         </div>

//         <button
//           type="button"
//           className={styles.buttonStyle}
//           onClick={() => router.push(`/${locale}/exam`)}
//         >
//           {t("redirect")}
//         </button>
//       </div>
//     );
//   }

//   return null;
// }





"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.module.scss";
import api from "@/interceptors";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  ExamSessionData,
  ExamSessionEndResponse,
  OptionData,
} from "../../interface";
import { AxiosError, AxiosResponse } from "axios";
import { useTranslations } from "next-intl";

function isExamSessionData(
  data: ExamSessionData | ExamSessionEndResponse
): data is ExamSessionData {
  return (data as ExamSessionData).current_question !== undefined;
}

function isExamSessionEndResponse(
  data: ExamSessionData | ExamSessionEndResponse
): data is ExamSessionEndResponse {
  return (data as ExamSessionEndResponse).final_score !== undefined;
}

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getLocalizedValue(
  value: string | Record<string, string> | null | undefined,
  lang: string
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.ka || value.en || value.ru || "";
}

function getOptionLabel(index: number, lang: string): string {
  const alphabets: Record<string, string[]> = {
    en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    ka: ["ა", "ბ", "გ", "დ", "ე", "ვ", "ზ", "თ", "ი", "კ"],
    ru: ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "К"],
  };

  const letters = alphabets[lang] || alphabets.en;
  return letters[index] || String(index + 1);
}

type WithEndsAt = { ends_at?: string | null };
type WithExamLanguage = { exam_language?: string };
type WithLocalizedSubject = {
  subject?: string | Record<string, string> | null;
};
type WithLocalizedTitle = {
  title?: string | Record<string, string> | null;
  exam_title?: string | Record<string, string> | null;
};

export default function SpecificExam() {
  const t = useTranslations("SpecificExam");

  const { id: ExamId } = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const locale = useMemo(() => {
    const seg = (pathname ?? "").split("/")[1];
    return seg || "en";
  }, [pathname]);

  const [data, setData] = useState<
    ExamSessionData | ExamSessionEndResponse | null
  >(null);
  const [loading, setLoading] = useState(true);

  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [endedByTimeout, setEndedByTimeout] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const finishingRef = useRef(false);

  const endsAt = useMemo(() => {
    if (!data) return null;
    const maybe = data as unknown as WithEndsAt;
    return maybe.ends_at ?? null;
  }, [data]);

  const examLanguage = useMemo(() => {
    if (!data) return locale;
    const maybe = data as unknown as WithExamLanguage;
    return maybe.exam_language || locale;
  }, [data, locale]);

  useEffect(() => {
    setLoading(true);

    api
      .post<ExamSessionData | ExamSessionEndResponse>(
        `exams/${ExamId}/start_or_resume/`
      )
      .then((res: AxiosResponse<ExamSessionData | ExamSessionEndResponse>) => {
        setData(res.data);
      })
      .catch((error: AxiosError) => {
        if (error.response?.status === 401) return router.push(`/${locale}/login`);
        if (error.response?.status === 403) return router.push(`/${locale}/exam`);
        if (error.response?.status === 404) return router.push(`/${locale}/exam`);
        if (error.response?.status === 400) {
          alert(t("alreadyCompleted"));
          return router.push(`/${locale}/exam`);
        }
      })
      .finally(() => setLoading(false));
  }, [ExamId, router, locale, t]);

  const finishSessionDueToTimeout = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    try {
      setEndedByTimeout(true);
      setLocked(true);
      setLoading(true);

      const res = await api.post<ExamSessionData | ExamSessionEndResponse>(
        `exams/${ExamId}/start_or_resume/`
      );
      setData(res.data);
    } catch {
      alert(t("timeUpEnded"));
      router.push(`/${locale}/exam`);
    } finally {
      setLoading(false);
    }
  }, [ExamId, router, locale, t]);

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    finishingRef.current = false;

    if (!endsAt) return;

    const tick = () => {
      const left = new Date(endsAt).getTime() - Date.now();
      const safe = Math.max(0, left);
      setTimeLeftMs(safe);

      if (left <= 0) {
        setLocked(true);

        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        finishSessionDueToTimeout();
        return;
      }

      setLocked(false);
    };

    tick();
    intervalRef.current = window.setInterval(tick, 250);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endsAt, finishSessionDueToTimeout]);

  const onAnswerSubmit = async (
    session_id: number,
    question_id: number,
    option_id: number
  ) => {
    if (locked) return;

    try {
      setLoading(true);

      const res = await api.post<ExamSessionData | ExamSessionEndResponse>(
        `sessions/${session_id}/answer/`,
        {
          question_id,
          option_id,
        }
      );

      setData(res.data);
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.status === 403) {
        setLocked(true);
        setEndedByTimeout(true);
        await finishSessionDueToTimeout();
        return;
      }

      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderWrapper}>
        <div className={styles.loader} />
      </div>
    );
  }

  if (data && isExamSessionData(data)) {
    const questionText = getLocalizedValue(
      data.current_question.text,
      examLanguage
    );

    const titleSource = data as unknown as WithLocalizedTitle;
    const subjectSource = data as unknown as WithLocalizedSubject;

    const examTitle =
      getLocalizedValue(titleSource.title, examLanguage) ||
      getLocalizedValue(titleSource.exam_title, examLanguage) ||
      getLocalizedValue(subjectSource.subject, examLanguage) ||
      t("badgeExam");

    const subjectTitle = getLocalizedValue(
      subjectSource.subject,
      examLanguage
    );

    return (
      <div className={styles.examMainContainer}>
        <div className={styles.examCard}>
          <div className={styles.examHeader}>
            <div className={styles.examTitle}>
              <h1 title={examTitle}>{examTitle}</h1>
              {subjectTitle && (
                <span className={styles.examBadge}>{subjectTitle}</span>
              )}
            </div>

            {endsAt && (
              <div
                className={`${styles.timer} ${
                  timeLeftMs <= 60_000 ? styles.timerDanger : ""
                }`}
              >
                <span>⏳</span>
                <span>{formatTime(timeLeftMs)}</span>
              </div>
            )}
          </div>

          <h2 className={styles.questionText}>{questionText}</h2>

          <ul className={styles.optionsList}>
            {data.current_question.options.map(
              (option: OptionData, index: number) => {
                const optionTitle = getLocalizedValue(
                  option.title,
                  examLanguage
                );

                return (
                  <li
                    key={option.id}
                    className={`${styles.specificQuestionWrapper} ${
                      locked ? styles.locked : ""
                    }`}
                    onClick={() =>
                      !locked &&
                      onAnswerSubmit(
                        data.session_id,
                        data.current_question.id,
                        option.id
                      )
                    }
                  >
                    <span className={styles.optionIndex}>
                      {`${getOptionLabel(index, examLanguage)})`}
                    </span>

                    <button
                      type="button"
                      className={styles.optionButton}
                      disabled={locked}
                    >
                      {optionTitle}
                    </button>
                  </li>
                );
              }
            )}
          </ul>

          <div className={styles.progress}>
            <span>{t("questionLabel")}</span>
            <span>
              {data.current_index + 1} / {data.len_questions}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (data && isExamSessionEndResponse(data)) {
    return (
      <div className={styles.finalExamContainer}>
        <div className={styles.finalHeader}>
          {endedByTimeout ? t("finalTimeUpTitle") : t("finalCompletedTitle")}
        </div>

        <div className={styles.finalScore}>
          {t("scoreLabel")}: {data.final_score}
        </div>
        <div className={styles.finalTotal}>
          {t("totalQuestionsLabel")}: {data.total_questions}
        </div>

        <div className={styles.finalMessage}>
          {endedByTimeout
            ? t("finalTimeUpMessage")
            : t("finalCompletedMessage")}
        </div>

        <button
          type="button"
          className={styles.buttonStyle}
          onClick={() => router.push(`/${locale}/exam`)}
        >
          {t("redirect")}
        </button>
      </div>
    );
  }

  return null;
}