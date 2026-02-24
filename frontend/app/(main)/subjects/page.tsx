// "use client";

// import { useEffect, useMemo, useState } from "react";
// import styles from "./subjects.module.scss";
// import { Modal, Select } from "antd";
// import api from "@/interceptors";
// import { FaAtom, } from "react-icons/fa";
// import { BackendSubject } from "./interface";
// import { Flex, Spin } from 'antd';



// export default function Subjects() {
//   const [subjects, setSubjects] = useState<BackendSubject[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [category, setCategory] = useState<string>("All");
//   const [bookId, setBookId] = useState<number | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState<boolean>(false);


//   useEffect(() => {
//     const fetchSubjects = async () => {
//       try {
//         const res = await api.get<BackendSubject[]>("/my_subjects/");
//         setSubjects(res.data);
//       }
//       catch (error) {
//         console.error("Failed to fetch subjects:", error);
//       }
//       finally {
//         setLoading(false);
//       }
//     };

//     fetchSubjects();
//   }, []);


//   const categoryOptions = useMemo(() => {
//     const unique = Array.from(
//       new Set(subjects.map((s) => s.grade__category__name))
//     );

//     return ["All", ...unique];
//   }, [subjects]);

//   const filtered = useMemo(() => {
//     if (category === "All") return subjects;
//     return subjects.filter(
//       (s) => s.grade__category__name === category
//     );
//   }, [subjects, category]);


//   const handleCancel = () => {
//     setIsModalOpen(false);
//   };

//   const specificBookFetch = async (subjectID: number, gradeID: number) => {
//     try {
//       setIsModalOpen(true);
//       console.log(subjectID)
//       console.log(gradeID)
//     }
//     catch {

//     }
//     finally {

//     }

//   }

//   return (
//     <div className={styles.mainContainer}>
//       <div className={styles.pageHeader}>
//         <div className={styles.titleBlock}>
//           <div className={styles.titleRow}>
//             <span className={styles.headerIcon}>
//               <FaAtom className={styles.navIcon} />
//             </span>
//             <h1 className={styles.title}>Subjects</h1>
//           </div>
//           <p className={styles.subtitle}>
//             Browse your assigned subjects.
//           </p>
//         </div>

//         <div className={styles.controls}>
//           <Select
//             value={category}
//             onChange={(v) => setCategory(v)}
//             className={styles.categorySelect}
//             options={categoryOptions.map((c) => ({
//               value: c,
//               label: c,
//             }))}
//           />
//         </div>
//       </div>

//       {loading ? (
//         <div className={styles.emptyState}>
//           <div className={styles.emptyTitle}>Loading subjects...</div>
//         </div>
//       ) : (
//         <>
//           <div className={styles.grid}>
//             {filtered.map((s) => {
//               const Icon = s.name;

//               return (
//                 <button key={s.pk} type="button" className={styles.card} onClick={() => specificBookFetch(s.pk, s.grade__pk)} >
//                   <div className={styles.cardTop}>
//                     <div className={styles.cardTitle}>
//                       <span className={styles.subjectIcon}>
//                         <Icon />
//                       </span>
//                       <span className={styles.subjectName} title={s.name}>
//                         {s.name}
//                       </span>
//                     </div>

//                     <span className={styles.categoryPill}>
//                       {s.grade__category__name}
//                     </span>
//                   </div>

//                   <div className={styles.cardMeta}>
//                     <div className={styles.metaItem}>
//                       <span className={styles.metaLabel}>Grade</span>
//                       <span className={styles.metaValue}>
//                         {s.grade__name}{s.grade__category__name}
//                       </span>
//                     </div>
//                   </div>
//                 </button>
//               );
//             })}
//           </div>

//           {filtered.length === 0 && (
//             <div className={styles.emptyState}>
//               <div className={styles.emptyTitle}>No results</div>
//               <div className={styles.emptyText}>
//                 Try changing the category.
//               </div>
//             </div>
//           )}
//           <>
//             <Modal
//               title="Basic Modal"
//               closable={{ 'aria-label': 'Custom Close Button' }}
//               open={isModalOpen}
//               onCancel={handleCancel}
//             >
//               <p>Some contents...</p>
//               <p>Some contents...</p>
//               <p>Some contents...</p>
//             </Modal>
//           </>
//         </>
//       )}
//     </div>
//   );
// }



"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./subjects.module.scss";
import { Modal, Select, message, Spin } from "antd";
import api from "@/interceptors";
import { FaAtom, FaExternalLinkAlt } from "react-icons/fa";
import { BackendSubject } from "./interface";
import type { AxiosError } from "axios";

type SubjectBookResponse = {
  id?: number;
  pdf_url?: string | null;
  uploaded_at?: string | null;
  grade?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("Book • PDF");

  // ✅ prevents setState after unmount
  const mountedRef = useRef(true);

  // ✅ prevents race conditions (double clicks)
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    // 🔹 your old fetch (untouched)
    const fetchSubjects = async () => {
      try {
        const res = await api.get<BackendSubject[]>("/my_subjects/");
        if (!mountedRef.current) return;
        setSubjects(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    };

    fetchSubjects();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(subjects.map((s) => s.grade__category__name).filter(Boolean)));
    return ["All", ...unique];
  }, [subjects]);

  const filtered = useMemo(() => {
    if (category === "All") return subjects;
    return subjects.filter((s) => s.grade__category__name === category);
  }, [subjects, category]);

  const handleCancel = () => {
    // ✅ if user closes while request is ongoing, invalidate request
    requestIdRef.current += 1;

    setIsModalOpen(false);
    setBookLoading(false);
    setBookError(null);
    setPdfUrl(null);
  };

  // ✅ ONLY this request
  const specificBookFetch = async (subjectID: number, gradeID: number) => {
    // new request id
    const myReqId = (requestIdRef.current += 1);

    // open modal immediately for loading UI
    setIsModalOpen(true);
    setBookLoading(true);
    setBookError(null);
    setPdfUrl(null);

    const subjectTitle = subjects.find((x) => x.pk === subjectID)?.name ?? "Book";
    setActiveTitle(`${subjectTitle} • PDF`);

    try {
      const res = await api.get<SubjectBookResponse>("/subjects/books/", {
        params: { subject_id: subjectID, grade_id: gradeID },
      });

      // ✅ ignore if modal closed or another request started
      if (!mountedRef.current || requestIdRef.current !== myReqId) return;

      const data = res?.data ?? {};
      const url = data?.pdf_url;

      if (!isNonEmptyString(url)) {
        setBookError("No PDF book found for this subject/grade.");
        return;
      }

      setPdfUrl(url);
    } catch (e: unknown) {
      if (!mountedRef.current || requestIdRef.current !== myReqId) return;

      const err = e as AxiosError<any>;
      const status = err?.response?.status;

      if (status === 404) {
        setBookError("No PDF book found for this subject/grade.");
        return;
      }

      console.error(e);
      setBookError("Failed to load PDF. Please try again.");
      message.error("Failed to load book PDF");
    } finally {
      if (!mountedRef.current || requestIdRef.current !== myReqId) return;
      setBookLoading(false);
    }
  };

  return (
    <div className={styles.mainContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.headerIcon}>
              <FaAtom className={styles.navIcon} />
            </span>
            <h1 className={styles.title}>Subjects</h1>
          </div>
          <p className={styles.subtitle}>Browse your assigned subjects.</p>
        </div>

        <div className={styles.controls}>
          <Select
            value={category}
            onChange={(v) => setCategory(v)}
            className={styles.categorySelect}
            options={categoryOptions.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Loading subjects...</div>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {filtered.map((s) => (
              <button
                key={s.pk}
                type="button"
                className={styles.card}
                onClick={() => specificBookFetch(s.pk, s.grade__pk)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardTitle}>
                    <span className={styles.subjectIcon}>
                      <FaAtom />
                    </span>
                    <span className={styles.subjectName} title={s.name}>
                      {s.name}
                    </span>
                  </div>

                  <span className={styles.categoryPill}>{s.grade__category__name}</span>
                </div>

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Grade</span>
                    <span className={styles.metaValue}>
                      {s.grade__name}
                      {s.grade__category__name}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No results</div>
              <div className={styles.emptyText}>Try changing the category.</div>
            </div>
          )}

          <Modal
            title={activeTitle}
            open={isModalOpen}
            onCancel={handleCancel}
            footer={null}
            width="min(1100px, 94vw)"
            centered
            className={styles.bookModal}
            destroyOnClose
          >
            <div className={styles.bookModalBody}>
              {bookLoading ? (
                <div className={styles.bookLoading}>
                  <Spin size="large" />
                  <div className={styles.bookLoadingText}>Loading PDF…</div>
                </div>
              ) : bookError ? (
                <div className={styles.bookError}>
                  <div className={styles.bookErrorTitle}>Couldn’t open the book</div>
                  <div className={styles.bookErrorText}>{bookError}</div>
                </div>
              ) : isNonEmptyString(pdfUrl) ? (
                <>
                  <div className={styles.bookTopBar}>
                    <a className={styles.bookAction} href={pdfUrl} target="_blank" rel="noopener noreferrer">
                      <FaExternalLinkAlt />
                      Open in new tab
                    </a>
                  </div>

                  <div className={styles.pdfFrameWrap}>
                    <iframe
                      key={pdfUrl}
                      src={pdfUrl}
                      className={styles.pdfFrame}
                      title="Book PDF"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}