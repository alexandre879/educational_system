'use client'

import { useEffect, useState } from "react";
import api from "@/interceptors";
import styles from "./exam.module.scss"
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
      }
      catch (err) {
        console.error(err);
      }
      finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);


  if (loading) return (
    <div className={styles.loaderWrapper}>
      <div className={styles.loader} />
    </div>
  );

  if (exams.length === 0) return <div className={styles.noExams}>
    <span>No exams available</span>
    <FiInbox size={48} />
  </div>;

  return (
    <div className={styles.examMainContainer}>
      {exams.map(({ id, title, subject, duration, questions_count }: ExamListData) => (
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
  );
}