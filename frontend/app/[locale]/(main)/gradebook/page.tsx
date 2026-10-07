"use client";

import { useState } from "react";
import { message, Modal, Popconfirm } from "antd";
import { Avatar } from "@mui/material";
import { FaClipboardList, FaPlus } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";

import api from "@/interceptors";
import { formatDay } from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { useApi } from "@/lib/useApi";
import type { Gradebook, MySubject } from "@/lib/types";
import { AverageBadge, MarkChip, markTone } from "../components/ui/Marks";
import { Chips, Empty, ErrorBox, Loading, PageHeader } from "../components/ui/Parts";
import ui from "../components/ui/ui.module.scss";

type Student = Gradebook["students"][number];

/** A teacher's class list for one subject: every student's marks, with quick entry. */
export default function GradebookPage() {
  const t = useTranslations("App");
  const locale = useLocale();

  const subjects = useApi<MySubject[]>("/my_subjects/");
  const [chosenId, setChosenId] = useState<number | undefined>();
  const subject = subjects.data?.find((s) => s.pk === chosenId) ?? subjects.data?.[0];

  const book = useApi<Gradebook>(subject ? "/teacher/marks/" : null, { subject_id: subject?.pk });
  const [student, setStudent] = useState<Student | null>(null);

  const subjectLabel = (s: MySubject) =>
    `${getLocalizedValue(s.name, locale)} · ${s.grade__name} ${getLocalizedValue(s.grade__category__name, locale)}`.trim();

  const removeMark = async (markId: number) => {
    try {
      await api.delete(`/teacher/marks/${markId}/`);
      message.success(t("gradebook.deleted"));
      book.reload();
    } catch {
      message.error(t("common.genericError"));
    }
  };

  return (
    <div className={ui.page}>
      <PageHeader
        icon={<FaClipboardList />}
        title={t("gradebook.title")}
        subtitle={book.data?.students.length ? t("web.deleteMarkHint") : undefined}
      />

      {subjects.loading && !subjects.data ? (
        <Loading />
      ) : subjects.error ? (
        <ErrorBox error={subjects.error} onRetry={subjects.reload} />
      ) : !subject ? (
        <Empty title={t("gradebook.noSubjects")} />
      ) : (
        <>
          <Chips
            options={(subjects.data ?? []).map((s) => ({ value: s.pk, label: subjectLabel(s) }))}
            value={subject.pk}
            onChange={setChosenId}
          />

          {book.loading && !book.data ? (
            <Loading />
          ) : book.error ? (
            <ErrorBox error={book.error} onRetry={book.reload} />
          ) : !book.data?.students.length ? (
            <Empty title={t("gradebook.noStudents")} />
          ) : (
            <div className={ui.grid2}>
              {book.data.students.map((row) => (
                <div key={row.id} className={ui.card}>
                  <div className={ui.row}>
                    <Avatar src={mediaUrl(row.profilePic)} alt={row.name} sx={{ width: 40, height: 40 }} />
                    <div className={`${ui.strong} ${ui.grow}`}>{row.name}</div>
                    <AverageBadge value={row.average} />
                    <button
                      type="button"
                      className={`${ui.iconBtn} ${ui.iconBtnPrimary}`}
                      aria-label={t("gradebook.addMark")}
                      title={t("gradebook.addMark")}
                      onClick={() => setStudent(row)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                  {row.marks.length ? (
                    <div className={ui.chips}>
                      {row.marks.map((mark) => (
                        <Popconfirm
                          key={mark.id}
                          title={t("gradebook.deleteTitle")}
                          description={t("gradebook.deleteMessage", {
                            value: mark.value,
                            date: formatDay(mark.date, t),
                          })}
                          okText={t("gradebook.delete")}
                          cancelText={t("common.cancel")}
                          okButtonProps={{ danger: true }}
                          onConfirm={() => removeMark(mark.id)}
                        >
                          <button
                            type="button"
                            className={ui.markButton}
                            title={[formatDay(mark.date, t), mark.comment].filter(Boolean).join(" · ")}
                          >
                            <MarkChip value={mark.value} size={34} />
                          </button>
                        </Popconfirm>
                      ))}
                    </div>
                  ) : (
                    <div className={ui.faint}>{t("gradebook.noMarks")}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {subject ? (
        <MarkDialog
          key={student?.id ?? "closed"}
          student={student}
          subjectId={subject.pk}
          maxMark={book.data?.max_mark ?? 10}
          onClose={() => setStudent(null)}
          onSaved={() => {
            setStudent(null);
            book.reload();
          }}
        />
      ) : null}
    </div>
  );
}

/** Pick a 1–10 mark and an optional comment for one student. */
function MarkDialog({
  student,
  subjectId,
  maxMark,
  onClose,
  onSaved,
}: {
  student: Student | null;
  subjectId: number;
  maxMark: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("App");
  const [value, setValue] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!student || value === null) return;
    setSaving(true);
    try {
      await api.post("/teacher/marks/", {
        student_id: student.id,
        subject_id: subjectId,
        value,
        comment: comment.trim(),
      });
      message.success(t("gradebook.saved"));
      onSaved();
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      message.error(status === 403 ? t("common.forbidden") : t("gradebook.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={student !== null}
      title={t("gradebook.markFor", { name: student?.name ?? "" })}
      onCancel={onClose}
      onOk={save}
      okText={t("common.save")}
      cancelText={t("common.cancel")}
      okButtonProps={{ disabled: value === null, loading: saving }}
      destroyOnHidden
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, margin: "12px 0" }}>
        {Array.from({ length: maxMark }, (_, i) => i + 1).map((option) => {
          const tone = markTone(option);
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => setValue(option)}
              className={ui.markChip}
              style={{
                width: "100%",
                height: 48,
                fontSize: 18,
                color: selected ? "#fff" : tone.color,
                background: selected ? tone.color : tone.background,
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
      <input
        className={ui.input}
        placeholder={t("gradebook.commentPlaceholder")}
        value={comment}
        maxLength={255}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
        }}
      />
    </Modal>
  );
}
