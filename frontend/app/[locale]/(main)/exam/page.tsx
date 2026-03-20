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

//   if (loading) {
//     return (
//       <div className={styles.loaderWrapper}>
//         <div className={styles.loader} />
//         <div className={styles.loaderText}>{t("loadingExams")}</div>
//       </div>
//     );
//   }

//   if (exams.length === 0) {
//     return (
//       <div className={styles.noExams}>
//         <div className={styles.topBar}>
//           <div className={styles.titleBlock}>
//             <div className={styles.titleRow}>
//               <span className={styles.headerIcon}>
//                 <FaFileAlt className={styles.navIcon} />
//               </span>
//               <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//             </div>
//           </div>
//         </div>

//         <div className={styles.emptyCard}>
//           <div className={styles.noExamsTitle}>{t("noExamsTitle")}</div>
//           <div className={styles.noExamsSub}>{t("noExamsSub")}</div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.page}>
//       <div className={styles.topBar}>
//         <div className={styles.titleBlock}>
//           <div className={styles.titleRow}>
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
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LocalizedValue = string | Record<string, string> | null | undefined;

function getLocalizedValue(value: LocalizedValue, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] || value.ka || value.en || value.ru || "";
}

export default function Exam() {
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

  const clearOpenExamQuery = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("openExam");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (loading) return;
    if (openExamParam && (openExamId === null || Number.isNaN(openExamId))) {
      clearOpenExamQuery();
    }
  }, [loading, openExamParam, openExamId]);

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
    </div>
  );
}