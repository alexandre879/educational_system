// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import styles from "./styles.module.scss";
// import api from "@/interceptors";
// import { useParams, useRouter } from "next/navigation";
// import { ExamSessionData, ExamSessionEndResponse, OptionData } from "../../interface";
// import { AxiosError, AxiosResponse } from "axios";

// function isExamSessionData(data: ExamSessionData | ExamSessionEndResponse): data is ExamSessionData {
//   return (data as ExamSessionData).current_question !== undefined;
// }

// function isExamSessionEndResponse(data: ExamSessionData | ExamSessionEndResponse): data is ExamSessionEndResponse {
//   return (data as ExamSessionEndResponse).final_score !== undefined;
// }

// function formatTime(ms: number) {
//   const total = Math.floor(ms / 1000);
//   const m = Math.floor(total / 60);
//   const s = total % 60;
//   return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
// }

// export default function SpecificExam() {
//   const { id: ExamId } = useParams();
//   const router = useRouter();

//   const [data, setData] = useState<ExamSessionData | ExamSessionEndResponse | null>(null);
//   const [loading, setLoading] = useState(true);

//   const [timeLeftMs, setTimeLeftMs] = useState(0);
//   const [locked, setLocked] = useState(false);
//   const [endedByTimeout, setEndedByTimeout] = useState(false);

//   const intervalRef = useRef<number | null>(null);
//   const finishingRef = useRef(false);

//   const endsAt = useMemo(() => {
//     if (!data) return null;
//     return (data as any).ends_at as string | undefined;
//   }, [data]);

//   useEffect(() => {
//     setLoading(true);

//     api.post<ExamSessionData | ExamSessionEndResponse>(`exams/${ExamId}/start_or_resume/`)
//       .then((res: AxiosResponse<ExamSessionData | ExamSessionEndResponse>) => {
//         setData(res.data);
//       })
//       .catch((error: AxiosError) => {
//         if (error.response?.status === 401) return router.push("/login");
//         if (error.response?.status === 403) return router.push("/exam");
//         if (error.response?.status === 404) return router.push("/exam");
//         if (error.response?.status === 400) {
//           alert("You already completed this exam");
//           return router.push("/exam");
//         }
//       })
//       .finally(() => setLoading(false));
//   }, [ExamId, router]);

//   const finishSessionDueToTimeout = useCallback(async () => {
//     if (finishingRef.current) return;
//     finishingRef.current = true;

//     try {
//       setEndedByTimeout(true);
//       setLocked(true);
//       setLoading(true);

//       const res = await api.post<ExamSessionData | ExamSessionEndResponse>(`exams/${ExamId}/start_or_resume/`);
//       setData(res.data);
//     } catch (error: any) {
//       alert("Time is up. Exam ended.");
//       router.push("/exam");
//     } finally {
//       setLoading(false);
//     }
//   }, [ExamId, router]);

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

//   const onAnswerSubmit = async (session_id: number, question_id: number, option_id: number) => {
//     if (locked) return;

//     try {
//       setLoading(true);
//       const res = await api.post<ExamSessionData | ExamSessionEndResponse>(`sessions/${session_id}/answer/`, {
//         question_id,
//         option_id,
//       });

//       setData(res.data);
//     } catch (error: any) {
//       if (error?.response?.status === 403) {
//         setLocked(true);
//         setEndedByTimeout(true);
//         await finishSessionDueToTimeout();
//         return;
//       }
//       console.log(error);
//     } finally {
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
//     return (
//       <div className={styles.examMainContainer}>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//           <h1 style={{ color: "tan" }}>
//             <span style={{ color: "brown" }}>Exam:</span> {data.subject}
//           </h1>

//           {endsAt && (
//             <div style={{ color: locked ? "crimson" : "tan", fontWeight: 700 }}>
//               ⏳ {formatTime(timeLeftMs)}
//             </div>
//           )}
//         </div>

//         <br />
//         <h2 className={styles.questionText}>{data.current_question.text}</h2>

//         <ul className={styles.optionsList}>
//           {data.current_question.options.map((option: OptionData, index: number) => (
//             <li
//               key={option.id}
//               className={styles.specificQuestionWrapper}
//               onClick={() => !locked && onAnswerSubmit(data.session_id, data.current_question.id, option.id)}
//               style={{ opacity: locked ? 0.6 : 1, pointerEvents: locked ? "none" : "auto" }}
//             >
//               <span>{index + 1}.</span>
//               <button className={styles.optionButton} disabled={locked}>
//                 {option.title}
//               </button>
//             </li>
//           ))}
//         </ul>

//         <div className={styles.progress}>
//           <span>Question</span>
//           <span>
//             {data.current_index + 1} / {data.len_questions}
//           </span>
//         </div>
//       </div>
//     );
//   }

//   if (data && isExamSessionEndResponse(data)) {
//     return (
//       <div className={styles.finalExamContainer}>
//         <div className={styles.finalHeader}>{endedByTimeout ? "⏰ Time is up!" : "🎉 Exam Completed!"}</div>

//         <div className={styles.finalScore}>Score: {data.final_score}</div>
//         <div className={styles.finalTotal}>Total Questions: {data.total_questions}</div>

//         <div className={styles.finalMessage}>
//           {endedByTimeout
//             ? "Time ran out, but your answers were submitted."
//             : "Nice work — your results were saved."}
//         </div>

//         <button className={styles.buttonStyle} onClick={() => router.push("/exam")}>
//           Redirect
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
import { useParams, useRouter } from "next/navigation";
import { ExamSessionData, ExamSessionEndResponse, OptionData } from "../../interface";
import { AxiosError, AxiosResponse } from "axios";

function isExamSessionData(data: ExamSessionData | ExamSessionEndResponse): data is ExamSessionData {
  return (data as ExamSessionData).current_question !== undefined;
}

function isExamSessionEndResponse(data: ExamSessionData | ExamSessionEndResponse): data is ExamSessionEndResponse {
  return (data as ExamSessionEndResponse).final_score !== undefined;
}

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SpecificExam() {
  const { id: ExamId } = useParams();
  const router = useRouter();

  const [data, setData] = useState<ExamSessionData | ExamSessionEndResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [endedByTimeout, setEndedByTimeout] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const finishingRef = useRef(false);

  const endsAt = useMemo(() => {
    if (!data) return null;
    return (data as any).ends_at as string | undefined;
  }, [data]);

  useEffect(() => {
    setLoading(true);

    api.post<ExamSessionData | ExamSessionEndResponse>(`exams/${ExamId}/start_or_resume/`)
      .then((res: AxiosResponse<ExamSessionData | ExamSessionEndResponse>) => {
        setData(res.data);
      })
      .catch((error: AxiosError) => {
        if (error.response?.status === 401) return router.push("/login");
        if (error.response?.status === 403) return router.push("/exam");
        if (error.response?.status === 404) return router.push("/exam");
        if (error.response?.status === 400) {
          alert("You already completed this exam");
          return router.push("/exam");
        }
      })
      .finally(() => setLoading(false));
  }, [ExamId, router]);

  const finishSessionDueToTimeout = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    try {
      setEndedByTimeout(true);
      setLocked(true);
      setLoading(true);

      const res = await api.post<ExamSessionData | ExamSessionEndResponse>(`exams/${ExamId}/start_or_resume/`);
      setData(res.data);
    } catch (error: any) {
      alert("Time is up. Exam ended.");
      router.push("/exam");
    } finally {
      setLoading(false);
    }
  }, [ExamId, router]);

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

  const onAnswerSubmit = async (session_id: number, question_id: number, option_id: number) => {
    if (locked) return;

    try {
      setLoading(true);
      const res = await api.post<ExamSessionData | ExamSessionEndResponse>(`sessions/${session_id}/answer/`, {
        question_id,
        option_id,
      });

      setData(res.data);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setLocked(true);
        setEndedByTimeout(true);
        await finishSessionDueToTimeout();
        return;
      }
      console.log(error);
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
    return (
      <div className={styles.examMainContainer}>
        <div className={styles.examCard}>
          <div className={styles.examHeader}>
            <div className={styles.examTitle}>
              <h1 title={String(data.subject)}>{data.subject}</h1>
              <span className={styles.examBadge}>Exam</span>
            </div>

            {endsAt && (
              <div className={`${styles.timer} ${timeLeftMs <= 60_000 ? styles.timerDanger : ""}`}>
                <span>⏳</span>
                <span>{formatTime(timeLeftMs)}</span>
              </div>
            )}
          </div>

          <h2 className={styles.questionText}>{data.current_question.text}</h2>

          <ul className={styles.optionsList}>
            {data.current_question.options.map((option: OptionData, index: number) => (
              <li
                key={option.id}
                className={`${styles.specificQuestionWrapper} ${locked ? styles.locked : ""}`}
                onClick={() => !locked && onAnswerSubmit(data.session_id, data.current_question.id, option.id)}
              >
                <span className={styles.optionIndex}>{index + 1}</span>
                <button className={styles.optionButton} disabled={locked}>
                  {option.title}
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.progress}>
            <span>Question</span>
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
        <div className={styles.finalHeader}>{endedByTimeout ? "⏰ Time is up!" : "🎉 Exam Completed!"}</div>

        <div className={styles.finalScore}>Score: {data.final_score}</div>
        <div className={styles.finalTotal}>Total Questions: {data.total_questions}</div>

        <div className={styles.finalMessage}>
          {endedByTimeout ? "Time ran out, but your answers were submitted." : "Nice work — your results were saved."}
        </div>

        <button className={styles.buttonStyle} onClick={() => router.push("/exam")}>
          Redirect
        </button>
      </div>
    );
  }

  return null;
}