'use client'

import { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import api from "@/interceptors";
import { useParams } from "next/navigation";
import { ExamSessionData, ExamSessionEndResponse, OptionData } from "../../interface";
import { AxiosError, AxiosResponse } from "axios";
import { useRouter } from "next/navigation";

function isExamSessionData(data: ExamSessionData | ExamSessionEndResponse): data is ExamSessionData {
  return (data as ExamSessionData).current_question !== undefined;
}

function isExamSessionEndResponse(data: ExamSessionData | ExamSessionEndResponse): data is ExamSessionEndResponse {
  return (data as ExamSessionEndResponse).final_score !== undefined;
}




export default function SpecificExam() {
  const { id: ExamId } = useParams();
  const router = useRouter()
  const [data, setData] = useState<ExamSessionData | ExamSessionEndResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);




  useEffect(() => {
    setLoading(true);
    api.post<ExamSessionData | ExamSessionEndResponse>(`exams/${ExamId}/start_or_resume/`)
      .then((res: AxiosResponse<ExamSessionData | ExamSessionEndResponse>) => {
        setData(res.data);
      })
      .catch((error: AxiosError) => {
        if (error.response?.status === 401) {
          return router.push('/login');
        } 
        else if (error.response?.status === 403) {
          return router.push('/exam');
        } 
        else if(error.response?.status === 404) {
          return router.push('/exam')
        }
        else if (error.response?.status === 400) {
          alert("You already completed this exam");
          return router.push('/exam');
        }
      })
      .finally(() => setLoading(false));
  }, [ExamId]);




  const onAnswerSubmit = async (session_id: number, question_id: number, option_id: number) => {
    try {
      setLoading(true);
      const res = await api.post<ExamSessionData | ExamSessionEndResponse>(
        `sessions/${session_id}/answer/`,
        { question_id, option_id }
      );
      setData(res.data);
    }
    catch (error) {
      console.log(error);
    }
    finally {
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
        <h1 style={{ color: 'tan' }} >
          <span style={{ color: 'brown' }}>Exam:</span> {data.subject}
        </h1>
        <br />
        <h2 className={styles.questionText}>{data.current_question.text}</h2>

        <ul className={styles.optionsList}>
          {data.current_question.options.map((option: OptionData, index: number) => (
            <li
              key={option.id}
              className={styles.specificQuestionWrapper}
              onClick={() =>
                onAnswerSubmit(data.session_id, data.current_question.id, option.id)
              }
            >
              <span>{index + 1}.</span>
              <button className={styles.optionButton}>{option.title}</button>
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
    );
  }




  if (data && isExamSessionEndResponse(data)) {
    return (
      <div className={styles.finalExamContainer}>
        <div className={styles.finalHeader}>🎉 Exam Completed!</div>
        <div className={styles.finalScore}>Score: {data.final_score}</div>
        <div className={styles.finalTotal}>Total Questions: {data.total_questions}</div>
        <div className={styles.finalMessage}>
          {data.final_score < 8 && data.final_score > 5 && <span>Normal result! keep going achievements are slowly getting reached from your dedication. 😏</span>}
          {data.final_score > 8 && <span>Well done! You have completed the exam successfully. 😊</span>}
          {data.final_score == 10 && <span>Well done! You have completed the exam successfully. 🥳 </span>}
          {data.final_score < 5 && <span>Bad result! You should take more time for a learning. 🙁</span>}
        </div>
        <button className={styles.buttonStyle} onClick={() => router.push('/exam')} >
          Redirect
        </button>
      </div>
    );
  }

  return null;
}