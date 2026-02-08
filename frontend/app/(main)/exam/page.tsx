
"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/interceptors";
import styles from "./exam.module.scss";
import ExamSectionComponent from "./ExamComponents/ExamSectionComponent/ExamSectionComponent";
import { ExamListData } from "./interface";
import { FiInbox } from "react-icons/fi";

export default function Exam() {
  const [exams, setExams] = useState<ExamListData[]>([]);
  const [loading, setLoading] = useState(true);

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

  const countText = useMemo(() => {
    const n = exams.length;
    return n === 1 ? "1 exam" : `${n} exams`;
  }, [exams.length]);

  if (loading)
    return (
      <div className={styles.loaderWrapper}>
        <div className={styles.loader} />
        <div className={styles.loaderText}>Loading exams…</div>
      </div>
    );

  if (exams.length === 0)
    return (
      <div className={styles.noExams}>
        <FiInbox size={48} />
        <div className={styles.noExamsTitle}>No exams available</div>
        <div className={styles.noExamsSub}>Check back later or ask your teacher.</div>
      </div>
    );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.pageTitle}>Exams</div>
          <div className={styles.pageSub}>{countText}</div>
        </div>
      </div>

      <div className={styles.examGrid}>
        {exams.map(({ id, title, subject, duration, questions_count }) => (
          <ExamSectionComponent
            key={id}
            id={id}
            title={title}
            subject={subject}
            duration={duration}
            questions_count={questions_count}
          />
        ))}
      </div>
    </div>
  );
}