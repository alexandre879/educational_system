import styles from "./ExamSectionComponent.module.scss";
import { ExamListData } from "../../interface";
import { useRouter } from "next/navigation";

const ExamSectionComponent = (props: ExamListData) => {


  const router = useRouter()


  const subjectEmoji = (subject: string) => {
    switch(subject.toLowerCase()) {
      case "math": return "➗";
      case "science": return "🔬";
      case "history": return "📜";
      case "english": return "🇺🇸";
      case "geography": return "🌍";
      case "germany": return "🇩🇪";
      case "spanish": return "🇪🇸";
      case "france": return "🇫🇷";
      default: return "📝";
    }
  }

  const onExamSectionClick = (examId: number) => {
    router.push(`/exam/${examId}/start`)
  }

  return (
    <div className={styles.ExamSectionMainContainer} onClick={() => onExamSectionClick(props.id)} >
      <h3 className={styles.examTitle}>
        {subjectEmoji(props.subject)} {props.title}
      </h3>
      <p className={styles.examSubject}>Subject: {props.subject}</p>
      <ul className={styles.examInfoList}>
        <li className={styles.examDuration}>⏱ Duration: <span>{props.duration}m</span></li>
        <li className={styles.examQuestions}>Questions: <span>{props.questions_count}</span></li>
      </ul>
    </div>
  );
};

export default ExamSectionComponent;