"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles.module.scss";
import api from "@/interceptors";
import { useParams, useRouter } from "next/navigation";
import {
  ExamSessionData,
  ExamSessionEndResponse,
  OptionData,
} from "../../interface";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { getLocalizedValue } from "@/lib/localized";
import Confetti from "../../../components/ui/Confetti";
import ui from "../../../components/ui/ui.module.scss";

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

function getOptionLabel(index: number, lang: string): string {
  const alphabets: Record<string, string[]> = {
    en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    ka: ["ა", "ბ", "გ", "დ", "ე", "ვ", "ზ", "თ", "ი", "კ"],
    ru: ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "К"],
  };

  const letters = alphabets[lang] || alphabets.en;
  return letters[index] || String(index + 1);
}

export default function SpecificExam() {
  const t = useTranslations("SpecificExam");
  const tApp = useTranslations("App");

  const { id: examId } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

  const [data, setData] = useState<
    ExamSessionData | ExamSessionEndResponse | null
  >(null);
  const [loading, setLoading] = useState(true);

  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [locked, setLocked] = useState(false);

  const finishingRef = useRef(false);

  const activeQuestion = data && isExamSessionData(data) ? data : null;
  // Only a question in progress has a running clock; the result screen must not time out.
  const endsAt = activeQuestion?.ends_at ?? null;
  const examLanguage = activeQuestion?.exam_language || locale;
  const endedByTimeout = !!data && isExamSessionEndResponse(data) && !!data.timed_out;

  // Starts, resumes or (once time is up) finishes the session on the server.
  const loadSession = useCallback(async () => {
    try {
      const res = await api.post<ExamSessionData | ExamSessionEndResponse>(
        `exams/${examId}/start_or_resume/`
      );
      setData(res.data);
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      if (status === 401) {
        router.push(`/${locale}/login`);
        return;
      }
      if (status === 400) {
        alert(t("alreadyCompleted"));
      } else if (status !== 403 && status !== 404) {
        console.error(err);
      }
      router.push(`/${locale}/exam`);
    }
  }, [examId, router, locale, t]);

  useEffect(() => {
    setLoading(true);
    void loadSession().finally(() => setLoading(false));
  }, [loadSession]);

  const finishSessionDueToTimeout = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    try {
      const res = await api.post<ExamSessionData | ExamSessionEndResponse>(
        `exams/${examId}/start_or_resume/`
      );

      if (isExamSessionData(res.data)) {
        // The server's clock hasn't reached the deadline yet; let the timer retry shortly.
        window.setTimeout(() => {
          finishingRef.current = false;
        }, 2000);
        return;
      }

      setData(res.data);
    } catch {
      alert(t("timeUpEnded"));
      router.push(`/${locale}/exam`);
    }
  }, [examId, router, locale, t]);

  useEffect(() => {
    if (!endsAt) return;

    const deadline = new Date(endsAt).getTime();

    const tick = () => {
      const left = deadline - Date.now();
      setTimeLeftMs(Math.max(0, left));

      if (left <= 0) {
        setLocked(true);
        void finishSessionDueToTimeout();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => window.clearInterval(intervalId);
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
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      // Out of sync (double submit, finished in another tab, time ran out):
      // reload the authoritative session state.
      if (status === 400 || status === 403 || status === 409) {
        await loadSession();
        return;
      }

      console.error(err);
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

    const subjectTitle = getLocalizedValue(data.subject, examLanguage);
    const examTitle =
      getLocalizedValue(data.title, examLanguage) || subjectTitle || t("badgeExam");

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
    // 80% or more of the possible points earns a celebration.
    const great = !!data.max_score && data.final_score / data.max_score >= 0.8;

    return (
      <div className={`${ui.page} ${ui.narrow}`}>
        <section className={ui.hero} style={{ alignItems: "center", textAlign: "center" }}>
          <h1 className={ui.heroTitle}>
            {endedByTimeout ? t("finalTimeUpTitle") : t("finalCompletedTitle")}
          </h1>
          <div className={ui.heroMuted}>
            {endedByTimeout ? t("finalTimeUpMessage") : t("finalCompletedMessage")}
          </div>
          <div className={ui.heroValue} style={{ fontSize: 64, marginTop: 8 }}>
            {data.max_score
              ? tApp("exams.scoreOf", { score: data.final_score, max: data.max_score })
              : data.final_score}
          </div>
          <div className={ui.heroMuted} style={{ fontWeight: 700 }}>
            {great ? tApp("exam.greatScore") : t("scoreLabel")}
          </div>
        </section>

        <div className={ui.statRow}>
          <div className={ui.statTile}>
            <span className={ui.statValue} style={{ color: "var(--primary-blue)" }}>{data.total_questions}</span>
            <span className={ui.statLabel}>{t("totalQuestionsLabel")}</span>
          </div>
          <div className={ui.statTile}>
            <span className={ui.statValue} style={{ color: "var(--accent)" }}>{data.subject_points ?? 0}</span>
            <span className={ui.statLabel}>{tApp("exam.subjectPoints")}</span>
          </div>
          <div className={ui.statTile}>
            <span className={ui.statValue} style={{ color: "var(--warn)" }}>{data.global_points ?? 0}</span>
            <span className={ui.statLabel}>{tApp("exam.totalPoints")}</span>
          </div>
        </div>

        <div className={ui.row} style={{ flexWrap: "wrap" }}>
          {data.session_id ? (
            <button
              type="button"
              className={`${ui.btn} ${ui.grow}`}
              onClick={() => router.replace(`/${locale}/exam/review/${data.session_id}`)}
            >
              {tApp("exam.reviewAnswers")}
            </button>
          ) : null}
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary} ${ui.grow}`}
            onClick={() => router.push(`/${locale}/exam`)}
          >
            {tApp("exam.backToExams")}
          </button>
        </div>

        {great ? <Confetti /> : null}
      </div>
    );
  }

  return null;
}