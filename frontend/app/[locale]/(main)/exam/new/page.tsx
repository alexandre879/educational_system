"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { message, Select } from "antd";
import { FaCheckCircle, FaMinus, FaPlus, FaRegCircle, FaTrash, FaFileAlt } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";

import api from "@/interceptors";
import { addDays, formatDay, toISODate } from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { useApi } from "@/lib/useApi";
import type { MySubject } from "@/lib/types";
import { Chips, Empty, ErrorBox, Loading, PageHeader } from "../../components/ui/Parts";
import ui from "../../components/ui/ui.module.scss";

const DURATIONS = [10, 15, 20, 30, 45, 60];
const DATE_OFFSETS = [0, 1, 3, 7] as const; // 0 = no date
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const MAX_POINTS = 10;
const LETTERS = "ABCDEF".split("");

interface DraftOption {
  key: string;
  title: string;
  correct: boolean;
}

interface DraftQuestion {
  key: string;
  text: string;
  points: number;
  options: DraftOption[];
}

const newKey = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const newOption = (): DraftOption => ({ key: newKey(), title: "", correct: false });
const newQuestion = (): DraftQuestion => ({ key: newKey(), text: "", points: 1, options: [newOption(), newOption(), newOption()] });

/** A teacher writes a multiple-choice exam; publishing notifies the class. */
export default function NewExamPage() {
  const t = useTranslations("App");
  const locale = useLocale();
  const router = useRouter();

  const subjects = useApi<MySubject[]>("/my_subjects/");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(20);
  const [dateOffset, setDateOffset] = useState<(typeof DATE_OFFSETS)[number]>(0);
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [newQuestion()]);
  const [publishing, setPublishing] = useState(false);

  const subject = subjects.data?.find((s) => s.pk === subjectId);
  const subjectLabel = (s: MySubject) =>
    `${getLocalizedValue(s.name, locale)} · ${s.grade__name} ${getLocalizedValue(s.grade__category__name, locale)}`.trim();

  const updateQuestion = (key: string, change: (question: DraftQuestion) => DraftQuestion) =>
    setQuestions((current) => current.map((q) => (q.key === key ? change(q) : q)));

  const complete =
    !!subject &&
    !!title.trim() &&
    questions.every((q) => q.text.trim() && q.options.every((o) => o.title.trim()) && q.options.some((o) => o.correct));

  const publish = async () => {
    if (!subject || !complete || publishing) return;
    setPublishing(true);
    try {
      await api.post("/teacher/exams/", {
        subject_id: subject.pk,
        title: title.trim(),
        duration,
        scheduled_for: dateOffset ? toISODate(addDays(new Date(), dateOffset)) : null,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          points: q.points,
          options: q.options.map((o) => ({ title: o.title.trim(), is_correct: o.correct })),
        })),
      });
      message.success(t("teacherExams.published"));
      router.push(`/${locale}/exam`);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      message.error(status === 403 ? t("common.forbidden") : t("teacherExams.publishFailed"));
      setPublishing(false);
    }
  };

  return (
    <div className={`${ui.page} ${ui.narrow}`}>
      <PageHeader icon={<FaFileAlt />} title={t("teacherExams.create")} backHref={`/${locale}/exam`} />

      {subjects.loading && !subjects.data ? (
        <Loading />
      ) : subjects.error ? (
        <ErrorBox error={subjects.error} onRetry={subjects.reload} />
      ) : !subjects.data?.length ? (
        <Empty title={t("gradebook.noSubjects")} />
      ) : (
        <>
          <section className={ui.card}>
            <label className={ui.field}>
              <span className={ui.label}>{t("teacherExams.subjectLabel")}</span>
              <Select
                placeholder={t("teacherExams.subjectPlaceholder")}
                value={subjectId ?? undefined}
                onChange={(value: number) => setSubjectId(value)}
                options={subjects.data.map((s) => ({ value: s.pk, label: subjectLabel(s) }))}
                size="large"
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>{t("teacherExams.titleLabel")}</span>
              <input
                className={ui.input}
                placeholder={t("teacherExams.titlePlaceholder")}
                value={title}
                maxLength={255}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className={ui.field}>
              <span className={ui.label}>{t("teacherExams.durationLabel")}</span>
              <Chips
                options={DURATIONS.map((minutes) => ({ value: minutes, label: t("common.minutes", { count: minutes }) }))}
                value={duration}
                onChange={setDuration}
              />
            </div>
            <div className={ui.field}>
              <span className={ui.label}>{t("teacherExams.dateLabel")}</span>
              <Chips
                options={DATE_OFFSETS.map((offset) => ({
                  value: offset,
                  label: offset === 0 ? t("teacherExams.noDate") : formatDay(addDays(new Date(), offset), t),
                }))}
                value={dateOffset}
                onChange={setDateOffset}
              />
            </div>
          </section>

          <span className={ui.muted}>{t("teacherExams.markCorrect")}</span>

          {questions.map((question, index) => (
            <QuestionEditor
              key={question.key}
              question={question}
              number={index + 1}
              canRemove={questions.length > 1}
              onChange={(change) => updateQuestion(question.key, change)}
              onRemove={() => setQuestions((current) => current.filter((q) => q.key !== question.key))}
            />
          ))}

          <button
            type="button"
            className={ui.btn}
            onClick={() => setQuestions((current) => [...current, newQuestion()])}
            disabled={questions.length >= 100}
          >
            <FaPlus aria-hidden /> {t("teacherExams.addQuestion")}
          </button>

          {!complete ? (
            <span className={ui.faint} style={{ textAlign: "center" }}>
              {t("teacherExams.incomplete")}
            </span>
          ) : null}

          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!complete || publishing} onClick={publish}>
            <FaFileAlt aria-hidden /> {t("teacherExams.publish")}
          </button>
        </>
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  number,
  canRemove,
  onChange,
  onRemove,
}: {
  question: DraftQuestion;
  number: number;
  canRemove: boolean;
  onChange: (change: (question: DraftQuestion) => DraftQuestion) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("App");

  const setOptionTitle = (key: string, title: string) =>
    onChange((q) => ({ ...q, options: q.options.map((o) => (o.key === key ? { ...o, title } : o)) }));
  // One correct answer per question: picking one clears the others.
  const markCorrect = (key: string) =>
    onChange((q) => ({ ...q, options: q.options.map((o) => ({ ...o, correct: o.key === key })) }));
  const setPoints = (points: number) => onChange((q) => ({ ...q, points }));

  return (
    <section className={ui.card}>
      <div className={ui.row}>
        <h2 className={`${ui.sectionTitle} ${ui.grow}`} style={{ margin: 0 }}>
          {t("teacherExams.questionLabel", { number })}
        </h2>
        <div
          className={ui.row}
          style={{ gap: 6, background: "var(--surface-muted)", borderRadius: 999, padding: "4px 6px" }}
          aria-label={`${t("teacherExams.pointsLabel")}: ${question.points}`}
        >
          <button
            type="button"
            className={ui.iconBtn}
            style={{ width: 26, height: 26 }}
            disabled={question.points <= 1}
            onClick={() => setPoints(Math.max(1, question.points - 1))}
          >
            <FaMinus size={10} />
          </button>
          <span className={ui.strong} style={{ minWidth: 18, textAlign: "center" }}>
            {question.points}
          </span>
          <button
            type="button"
            className={ui.iconBtn}
            style={{ width: 26, height: 26 }}
            disabled={question.points >= MAX_POINTS}
            onClick={() => setPoints(Math.min(MAX_POINTS, question.points + 1))}
          >
            <FaPlus size={10} />
          </button>
          <span className={ui.faint} style={{ paddingRight: 6 }}>
            {t("teacherExams.pointsLabel")}
          </span>
        </div>
        {canRemove ? (
          <button
            type="button"
            className={ui.iconBtn}
            style={{ color: "var(--bad)" }}
            aria-label={t("teacherExams.removeQuestion")}
            title={t("teacherExams.removeQuestion")}
            onClick={onRemove}
          >
            <FaTrash size={13} />
          </button>
        ) : null}
      </div>

      <textarea
        className={ui.textarea}
        placeholder={t("teacherExams.questionPlaceholder")}
        value={question.text}
        maxLength={2000}
        onChange={(e) => {
          const text = e.target.value;
          onChange((q) => ({ ...q, text }));
        }}
      />

      {question.options.map((option, index) => (
        <div key={option.key} className={ui.row} style={{ gap: 8 }}>
          <button
            type="button"
            role="radio"
            aria-checked={option.correct}
            aria-label={LETTERS[index]}
            onClick={() => markCorrect(option.key)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
          >
            {option.correct ? (
              <FaCheckCircle size={24} color="var(--ok)" />
            ) : (
              <FaRegCircle size={24} color="var(--text-muted)" />
            )}
          </button>
          <input
            className={ui.input}
            style={option.correct ? { background: "var(--ok-muted)", borderColor: "var(--ok)" } : undefined}
            placeholder={t("teacherExams.optionPlaceholder", { letter: LETTERS[index] })}
            value={option.title}
            maxLength={500}
            onChange={(e) => setOptionTitle(option.key, e.target.value)}
          />
          {question.options.length > MIN_OPTIONS ? (
            <button
              type="button"
              className={ui.iconBtn}
              style={{ width: 30, height: 30 }}
              aria-label={t("web.removeOption")}
              title={t("web.removeOption")}
              onClick={() => onChange((q) => ({ ...q, options: q.options.filter((o) => o.key !== option.key) }))}
            >
              <FaMinus size={11} />
            </button>
          ) : null}
        </div>
      ))}

      {question.options.length < MAX_OPTIONS ? (
        <button
          type="button"
          className={ui.sectionAction}
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => onChange((q) => ({ ...q, options: [...q.options, newOption()] }))}
        >
          <FaPlus size={11} /> {t("teacherExams.addOption")}
        </button>
      ) : null}
    </section>
  );
}
