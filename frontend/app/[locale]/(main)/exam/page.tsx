"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/interceptors";
import styles from "./exam.module.scss";
import ExamSectionComponent from "./ExamComponents/ExamSectionComponent/ExamSectionComponent";
import { ExamListData } from "./interface";
import { FaFileAlt } from "react-icons/fa";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getLocalizedValue, type LocalizedValue } from "@/lib/localized";
import { useMe } from "../components/MeContext";
import { ChildPicker, useStudentScope } from "../components/ChildPicker";
import { Loading, PageHeader, Tabs } from "../components/ui/Parts";
import ui from "../components/ui/ui.module.scss";
import ExamResults from "./components/ExamResults";
import TeacherExams from "./components/TeacherExams";

type Tab = "available" | "results";

/** Students take exams and see their results; teachers manage theirs; parents see their child's results. */
export default function ExamPage() {
  const me = useMe();

  if (!me) return <Loading />;
  if (me.role === "teacher") return <TeacherExams />;
  if (me.role === "parent") return <ParentResults />;
  if (me.role === "admin") return <AdminExams />;
  return <StudentExams />;
}

/** Admins have no results of their own, so just the list. */
function AdminExams() {
  const t = useTranslations("App");
  return (
    <div className={ui.page}>
      <PageHeader icon={<FaFileAlt />} title={t("exams.title")} />
      <AvailableExams />
    </div>
  );
}

function ParentResults() {
  const t = useTranslations("App");
  const [chosen, setChosen] = useState<number | undefined>();
  const scope = useStudentScope(chosen);

  return (
    <div className={ui.page}>
      <PageHeader icon={<FaFileAlt />} title={t("exams.completed")} />
      <ChildPicker childList={scope.children} value={scope.studentId} onChange={setChosen} />
      <ExamResults studentId={scope.studentId} enabled={scope.ready} />
    </div>
  );
}

function StudentExams() {
  const t = useTranslations("App");
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "results" ? "results" : "available";
  const router = useRouter();
  const pathname = usePathname();

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "results") params.set("tab", "results");
    else params.delete("tab");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className={ui.page}>
      <PageHeader icon={<FaFileAlt />} title={t("exams.title")} />
      <Tabs
        options={[
          { value: "available" as Tab, label: t("exams.available") },
          { value: "results" as Tab, label: t("exams.completed") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "results" ? <ExamResults /> : <AvailableExams />}
    </div>
  );
}

function AvailableExams() {
  const t = useTranslations("Exam");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [exams, setExams] = useState<ExamListData[]>([]);
  const [loading, setLoading] = useState(true);

  const openExamParam = searchParams.get("openExam");
  const openExamId = openExamParam ? Number(openExamParam) : null;

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get<ExamListData[]>("/exams/");
        setExams(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!openExamId || Number.isNaN(openExamId)) return;

    const targetExam = exams.find((exam) => exam.id === openExamId);
    if (!targetExam) return;

    router.replace(`/${locale}/exam/${openExamId}/start`);
  }, [loading, openExamId, exams, router, locale]);

  const countText = useMemo(() => {
    const n = exams.length;
    return n === 1
      ? t("examCountSingle")
      : t("examCountMultiple", { count: n });
  }, [exams.length, t]);

  const clearOpenExamQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("openExam");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (loading) return;
    if (openExamParam && (openExamId === null || Number.isNaN(openExamId))) {
      clearOpenExamQuery();
    }
  }, [loading, openExamParam, openExamId, clearOpenExamQuery]);

  if (loading) {
    return (
      <div className={styles.loaderWrapper}>
        <div className={styles.loader} />
        <div className={styles.loaderText}>{t("loadingExams")}</div>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <div className={styles.noExamsTitle}>{t("noExamsTitle")}</div>
        <div className={styles.noExamsSub}>{t("noExamsSub")}</div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.pageSub}>{countText}</div>
      <div className={styles.examGrid}>
        {exams.map(({ id, title, subject, duration, questions_count }) => {
          const localizedTitle = getLocalizedValue(
            title as LocalizedValue,
            locale
          );

          const localizedSubject = getLocalizedValue(
            subject as LocalizedValue,
            locale
          );

          return (
            <ExamSectionComponent
              key={id}
              id={id}
              title={localizedTitle}
              subject={localizedSubject}
              duration={duration}
              questions_count={questions_count}
            />
          );
        })}
      </div>
    </>
  );
}
