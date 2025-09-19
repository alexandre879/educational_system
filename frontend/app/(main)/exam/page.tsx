'use client'

import { useEffect, useState } from "react";
import api from "@/interceptors";
import styles from "./exam.module.scss"

import ExamSectionComponent from "./ExamComponents/ExamSectionComponent/ExamSectionComponent";
import { ExamListData } from "./interface";

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

  if (loading) return <div className={styles.loading}>⏳ Loading exams...</div>;
  if (exams.length === 0) return <p className={styles.noExams}>😢 No exams available</p>;

  return (
    <div className={styles.examMainContainer}>
      {exams.map((exam) => (
        <ExamSectionComponent
          key={exam.id}
          id={exam.id}
          title={exam.title}
          subject={exam.subject}
          duration={exam.duration}
          questions_count={exam.questions_count}
        />
      ))}
    </div>
  );
}