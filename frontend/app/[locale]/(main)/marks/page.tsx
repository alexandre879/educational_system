"use client";

import { useState } from "react";
import { Popover } from "antd";
import { FaStar } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { formatDay } from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { useApi } from "@/lib/useApi";
import type { StudentMarks } from "@/lib/types";
import { ChildPicker, useStudentScope } from "../components/ChildPicker";
import { AverageBadge, MarkChip } from "../components/ui/Marks";
import { Empty, ErrorBox, Loading, PageHeader, SubjectMark } from "../components/ui/Parts";
import ui from "../components/ui/ui.module.scss";

/** Students see their marks; parents see a child's (switchable when they have several). */
export default function MarksPage() {
  const t = useTranslations("App");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const fromLink = Number(searchParams.get("student")) || undefined;
  const [chosen, setChosen] = useState<number | undefined>(fromLink);
  const scope = useStudentScope(chosen);

  const { data, error, loading, reload } = useApi<StudentMarks>(scope.ready ? "/marks/" : null, {
    student_id: scope.studentId,
  });

  const subjects = (data?.subjects ?? []).slice().sort((a, b) => b.marks.length - a.marks.length);
  const total = subjects.reduce((sum, subject) => sum + subject.marks.length, 0);

  return (
    <div className={ui.page}>
      <PageHeader icon={<FaStar />} title={t("marks.title")} />
      <ChildPicker childList={scope.children} value={scope.studentId} onChange={setChosen} />

      {!data && (loading || !scope.ready) ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : data ? (
        <>
          <section className={ui.hero}>
            <div className={ui.heroRow}>
              <div className={ui.grow}>
                <div className={ui.heroMuted}>{data.student.name}</div>
                <h2 className={ui.heroTitle}>{t("marks.average")}</h2>
                <div className={ui.heroMuted}>{t("marks.count", { count: total })}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={ui.heroValue}>{data.average === null ? "—" : data.average.toFixed(1)}</div>
                <div className={ui.heroMuted}>/ {data.max_mark}</div>
              </div>
            </div>
          </section>

          {total === 0 ? (
            <Empty title={t("marks.noMarks")} message={t("marks.noMarksHint")} />
          ) : (
            <div className={ui.grid2}>
              {subjects.map((subject) => {
                const name = getLocalizedValue(subject.subject, locale);
                return (
                  <div key={subject.subject_id} className={ui.card}>
                    <div className={ui.row}>
                      <SubjectMark subjectId={subject.subject_id} label={name} size={40} />
                      <div className={ui.grow}>
                        <div className={ui.strong}>{name}</div>
                        <div className={ui.muted}>{t("marks.count", { count: subject.marks.length })}</div>
                      </div>
                      <AverageBadge value={subject.average} />
                    </div>
                    {subject.marks.length ? (
                      <div className={ui.chips}>
                        {subject.marks.map((mark) => (
                          <Popover
                            key={mark.id}
                            trigger={["hover", "click"]}
                            title={`${name}: ${mark.value}/${data.max_mark}`}
                            content={
                              <div>
                                <div>{formatDay(mark.date, t)}</div>
                                {mark.teacher ? <div>{mark.teacher}</div> : null}
                                {mark.comment ? <div>{mark.comment}</div> : null}
                              </div>
                            }
                          >
                            <span>
                              <MarkChip value={mark.value} />
                            </span>
                          </Popover>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
