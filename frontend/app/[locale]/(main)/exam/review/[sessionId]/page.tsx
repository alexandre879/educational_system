"use client";

import { useParams } from "next/navigation";
import { FaCheckCircle, FaRegCircle, FaTimesCircle, FaClipboardCheck } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";

import { getLocalizedValue } from "@/lib/localized";
import { useApi } from "@/lib/useApi";
import type { ExamReview } from "@/lib/types";
import { useMe } from "../../../components/MeContext";
import { ErrorBox, Loading, PageHeader, Pill, ProgressBar, SubjectMark } from "../../../components/ui/Parts";
import ui from "../../../components/ui/ui.module.scss";

/** A finished exam, question by question, with the chosen and the correct answers. */
export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const t = useTranslations("App");
  const locale = useLocale();
  const me = useMe();
  const { data, error, loading, reload } = useApi<ExamReview>(`/sessions/${Number(sessionId)}/review/`);

  const correct = data?.questions.filter((q) => q.is_correct).length ?? 0;
  // Parents reach this from their child's page.
  const backHref = me?.role === "parent" ? `/${locale}/home` : `/${locale}/exam?tab=results`;

  return (
    <div className={`${ui.page} ${ui.narrow}`}>
      <PageHeader icon={<FaClipboardCheck />} title={t("review.title")} backHref={backHref} />

      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : (
        <>
          <section className={ui.card}>
            <div className={ui.row}>
              <SubjectMark subjectId={data.subject_id} label={getLocalizedValue(data.subject, locale) || data.title} size={48} />
              <div className={ui.grow}>
                <div className={`${ui.strong} ${ui.wrap}`} style={{ fontSize: 17 }}>
                  {data.title}
                </div>
                <div className={ui.muted}>{getLocalizedValue(data.subject, locale)}</div>
              </div>
              <span style={{ fontSize: 24, fontWeight: 900, color: "var(--primary-blue)" }}>
                {t("exams.scoreOf", { score: data.score, max: data.max_score })}
              </span>
            </div>
            <ProgressBar value={data.questions.length ? correct / data.questions.length : 0} color="var(--ok)" />
            <span className={ui.muted}>
              {t("review.summary", { correct, total: data.questions.length })}
              {data.timed_out ? ` · ${t("exams.timedOut")}` : ""}
            </span>
          </section>

          {data.questions.map((question, index) => (
            <section key={question.id} className={ui.card}>
              <div className={ui.row}>
                <span className={`${ui.muted} ${ui.grow}`} style={{ fontWeight: 700 }}>
                  {t("teacherExams.questionLabel", { number: index + 1 })} · {question.points}{" "}
                  {t("teacherExams.pointsLabel").toLowerCase()}
                </span>
                <Pill tone={question.is_correct ? "ok" : question.chosen_option_id === null ? "neutral" : "bad"}>
                  {question.chosen_option_id === null
                    ? t("review.notAnswered")
                    : question.is_correct
                      ? t("review.correct")
                      : t("review.wrong")}
                </Pill>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.5 }}>{question.text}</div>

              <div className={ui.stack} style={{ gap: 8 }}>
                {question.options.map((option) => {
                  const chosen = option.id === question.chosen_option_id;
                  const tone = option.is_correct
                    ? { color: "var(--ok)", background: "var(--ok-muted)" }
                    : chosen
                      ? { color: "var(--bad)", background: "var(--bad-muted)" }
                      : { color: "var(--text-secondary)", background: "var(--surface-muted)" };
                  const Icon = option.is_correct ? FaCheckCircle : chosen ? FaTimesCircle : FaRegCircle;

                  return (
                    <div key={option.id} className={ui.option} style={{ background: tone.background }}>
                      <Icon className={ui.optionIcon} color={tone.color} aria-hidden />
                      <div className={ui.grow}>
                        <div style={option.is_correct || chosen ? { color: tone.color, fontWeight: 600 } : undefined}>
                          {option.title}
                        </div>
                        {chosen || option.is_correct ? (
                          <div className={ui.faint} style={{ color: tone.color }}>
                            {chosen && option.is_correct
                              ? `${t("review.yourAnswer")} · ${t("review.correct")}`
                              : chosen
                                ? t("review.yourAnswer")
                                : t("review.correctAnswer")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
