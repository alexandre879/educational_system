// "use client";

// import { useEffect, useMemo, useState } from "react";
// import api from "@/interceptors";
// import styles from "./exam.module.scss";
// import ExamSectionComponent from "./ExamComponents/ExamSectionComponent/ExamSectionComponent";
// import { ExamListData } from "./interface";
// import { FaFileAlt } from "react-icons/fa";
// import { useTranslations } from "next-intl";

// export default function Exam() {
//   const t = useTranslations("Exam");

//   const [exams, setExams] = useState<ExamListData[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchExams = async () => {
//       try {
//         const res = await api.get<ExamListData[]>("/exams/");
//         setExams(res.data);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchExams();
//   }, []);

//   const countText = useMemo(() => {
//     const n = exams.length;
//     return n === 1
//       ? t("examCountSingle")
//       : t("examCountMultiple", { count: n });
//   }, [exams.length, t]);

//   if (loading)
//     return (
//       <div className={styles.loaderWrapper}>
//         <div className={styles.loader} />
//         <div className={styles.loaderText}>{t("loadingExams")}</div>
//       </div>
//     );

//   if (exams.length === 0)
//     return (
//       <div className={styles.noExams}>
//         <div className={styles.WrapperOfMainCaptionAndIcon}>
//           <span className={styles.headerIcon}>
//             <FaFileAlt className={styles.navIcon} />
//           </span>
//           <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//         </div>
//         <div className={styles.wrapperForNonAvailableExams}>
//           <div className={styles.noExamsTitle}>{t("noExamsTitle")}</div>
//           <div className={styles.noExamsSub}>{t("noExamsSub")}</div>
//         </div>
//       </div>
//     );

//   return (
//     <div className={styles.page}>
//       <div className={styles.topBar}>
//         <div>
//           <div className={styles.WrapperOfMainCaptionAndIcon}>
//             <span className={styles.headerIcon}>
//               <FaFileAlt className={styles.navIcon} />
//             </span>
//             <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//           </div>
//           <div className={styles.pageSub}>{countText}</div>
//         </div>
//       </div>

//       <div className={styles.examGrid}>
//         {exams.map(({ id, title, subject, duration, questions_count }) => (
//           <ExamSectionComponent
//             key={id}
//             id={id}
//             title={title}
//             subject={subject}
//             duration={duration}
//             questions_count={questions_count}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }






"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/interceptors";
import styles from "./exam.module.scss";
import ExamSectionComponent from "./ExamComponents/ExamSectionComponent/ExamSectionComponent";
import { ExamListData } from "./interface";
import { FaFileAlt } from "react-icons/fa";
import { useTranslations } from "next-intl";

export default function Exam() {
  const t = useTranslations("Exam");

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
    return n === 1
      ? t("examCountSingle")
      : t("examCountMultiple", { count: n });
  }, [exams.length, t]);

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
      <div className={styles.noExams}>
        <div className={styles.topBar}>
          <div className={styles.titleBlock}>
            <div className={styles.titleRow}>
              <span className={styles.headerIcon}>
                <FaFileAlt className={styles.navIcon} />
              </span>
              <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
            </div>
          </div>
        </div>

        <div className={styles.emptyCard}>
          <div className={styles.noExamsTitle}>{t("noExamsTitle")}</div>
          <div className={styles.noExamsSub}>{t("noExamsSub")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.headerIcon}>
              <FaFileAlt className={styles.navIcon} />
            </span>
            <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
          </div>

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