"use client";

import { useState } from "react";
import { Modal } from "antd";
import styles from "./ExamSectionComponent.module.scss";
import { ExamListData } from "../../interface";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useLocale, useTranslations } from "next-intl";

const subjectEmoji = (subject: string) => {
  switch (subject.toLowerCase()) {
    case "math": return "➗";
    case "science": return "🔬";
    case "physic": return "🪐";
    case "computer science": return "💻";
    case "history": return "📜";
    case "english": return "🇺🇸";
    case "italy": return "🇮🇹";
    case "geography": return "🌍";
    case "georgia": return "🇬🇪";
    case "german": return "🇩🇪";
    case "spanish": return "🇪🇸";
    case "france": return "🇫🇷";
    default: return "📝";
  }
};

const ExamSectionComponent = (props: ExamListData) => {
  const t = useTranslations("Exam");
  const tApp = useTranslations("App");
  const locale = useLocale();
  const router = useRouter();
  // The timer starts as soon as the exam opens, so ask first (as the mobile app does).
  const [confirming, setConfirming] = useState(false);

  const startExam = () => {
    setConfirming(false);
    Cookies.set(props.subject.toLowerCase(), props.subject);
    router.push(`/${locale}/exam/${props.id}/start`);
  };

  return (
    <>
      <button
        type="button"
        className={styles.card}
        onClick={() => setConfirming(true)}
      >
        <div className={styles.cardTop}>
          <div className={styles.title} title={props.title}>
            <span className={styles.emoji}>{subjectEmoji(props.subject)}</span>
            <span className={styles.titleText}>
              {props.title.split("-")[0]}
            </span>
          </div>

          <div className={styles.subjectPill}>{props.subject}</div>
        </div>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t("duration")}</span>
            <span className={styles.metaValue}>
              ⏱ {props.duration}m
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t("questions")}</span>
            <span className={styles.metaValue}>
              🧩 {props.questions_count}
            </span>
          </div>
        </div>
      </button>

      <Modal
        open={confirming}
        title={tApp("exams.startTitle")}
        onOk={startExam}
        onCancel={() => setConfirming(false)}
        okText={tApp("exams.start")}
        cancelText={tApp("common.cancel")}
      >
        {tApp("exams.startMessage", { minutes: props.duration })}
      </Modal>
    </>
  );
};

export default ExamSectionComponent;
