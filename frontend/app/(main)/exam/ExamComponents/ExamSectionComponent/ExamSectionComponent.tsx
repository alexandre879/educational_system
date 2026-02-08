
import styles from "./ExamSectionComponent.module.scss";
import { ExamListData } from "../../interface";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

const subjectEmoji = (subject: string) => {
  switch (subject.toLowerCase()) {
    case "math":
      return "➗";
    case "science":
      return "🔬";
    case "physic":
      return "🪐";
    case "computer science":
      return "💻";
    case "history":
      return "📜";
    case "english":
      return "🇺🇸";
    case "italy":
      return "🇮🇹";
    case "geography":
      return "🌍";
    case "georgia":
      return "🇬🇪";
    case "german":
      return "🇩🇪";
    case "spanish":
      return "🇪🇸";
    case "france":
      return "🇫🇷";
    default:
      return "📝";
  }
};

const ExamSectionComponent = (props: ExamListData) => {
  const router = useRouter();

  const onExamSectionClick = (examId: number, subject: string) => {
    router.push(`/exam/${examId}/start`);
    Cookies.set(subject.toLowerCase(), subject);
  };



  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onExamSectionClick(props.id, props.subject)}
    >
      <div className={styles.cardTop}>
        <div className={styles.title} title={props.title}>
          <span className={styles.emoji}>{subjectEmoji(props.subject)}</span>
          <span className={styles.titleText}>{props.title.split('-')[0]}</span>
        </div>

        <div className={styles.subjectPill}>{props.subject}</div>
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Duration</span>
          <span className={styles.metaValue}>⏱ {props.duration}m</span>
        </div>

        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Questions</span>
          <span className={styles.metaValue}>🧩 {props.questions_count}</span>
        </div>
      </div>
    </button>
  );
};

export default ExamSectionComponent;