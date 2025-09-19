'use client'

import { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import api from "@/interceptors";
import { useParams } from "next/navigation";
import { QuestionData, ExamSessionData } from "../../interface";

export default function SpecificExam() {

  const {id} = useParams()

  useEffect(() => {
    api.post<ExamSessionData>(`exams/${id}/start_or_resume/`).then((res) => console.log('zz'))
  }, [id])

  return(
    <div>

    </div>
  )
}

//   return (
//     <div className={styles.examMainContainer}>
//       <h2 className={styles.questionText}>{currentQuestion.text}</h2>
//       <ul className={styles.optionsList}>
//         {currentQuestion.options.map((option, index) => (
//           <>

//             <div className={styles.currentQuestionWrapper} key={index + 1} >
//               <span>{index + 1}.</span>
//               <li className={styles.specificQuestionWrapper} key={option.id}>
//                 <button
//                   className={styles.optionButton}
//                   onClick={() => submitAnswer(option.id)}
//                   disabled={submitting}
//                 >
//                   {option.title}
//                 </button>
//               </li>
//             </div>
//             <div className={styles.progress}>
//               Question {currentIndex + 1}
//             </div>
//             <div className={styles.score}>Score: {score}</div> <br />
//           </>

//         ))}
//       </ul>
//     </div>
//   );
// }