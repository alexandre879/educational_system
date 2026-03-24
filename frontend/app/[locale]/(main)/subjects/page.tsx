// "use client";

// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import styles from "./subjects.module.scss";
// import { Modal, Select, message, Spin, Empty } from "antd";
// import api from "@/interceptors";
// import { FaAtom, FaExternalLinkAlt } from "react-icons/fa";
// import { BackendSubject, SubjectBookResponse } from "./interface";
// import axios from "axios";
// import { useTranslations } from "next-intl";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";

// type LocalizedValue = string | Record<string, string> | null | undefined;

// function isNonEmptyString(value: unknown): value is string {
//   return typeof value === "string" && value.trim().length > 0;
// }

// function getLocalizedValue(value: LocalizedValue, locale: string): string {
//   if (!value) return "";
//   if (typeof value === "string") return value;
//   return value[locale] || value.ka || value.en || value.ru || "";
// }

// export default function Subjects() {
//   const t = useTranslations("Subjects");
//   const pathname = usePathname();
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   const locale = pathname?.split("/")[1] || "en";
//   const openSubjectParam = searchParams.get("openSubject");
//   const openSubjectId = openSubjectParam ? Number(openSubjectParam) : null;

//   const [subjects, setSubjects] = useState<BackendSubject[]>([]);
//   const [loading, setLoading] = useState(true);

//   const ALL = "All";
//   const [category, setCategory] = useState<string>(ALL);

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [bookLoading, setBookLoading] = useState(false);
//   const [bookError, setBookError] = useState<string | null>(null);
//   const [pdfUrl, setPdfUrl] = useState<string | null>(null);
//   const [activeTitle, setActiveTitle] = useState("Book • PDF");

//   const mountedRef = useRef(true);
//   const requestIdRef = useRef(0);
//   const lastOpenedSubjectIdRef = useRef<number | null>(null);
//   const isClosingRef = useRef(false);

//   const replaceSubjectQuery = useCallback(
//     (id?: number | null) => {
//       const params = new URLSearchParams(searchParams.toString());

//       if (id) {
//         params.set("openSubject", String(id));
//       } else {
//         params.delete("openSubject");
//       }

//       const query = params.toString();
//       router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
//     },
//     [pathname, router, searchParams]
//   );

//   useEffect(() => {
//     mountedRef.current = true;

//     const fetchSubjects = async () => {
//       try {
//         const res = await api.get<BackendSubject[]>("/my_subjects/");
//         if (!mountedRef.current) return;
//         setSubjects(Array.isArray(res.data) ? res.data : []);
//       } catch (error) {
//         console.error("Failed to fetch subjects:", error);
//       } finally {
//         if (!mountedRef.current) return;
//         setLoading(false);
//       }
//     };

//     fetchSubjects();

//     return () => {
//       mountedRef.current = false;
//     };
//   }, []);

//   const categoryOptions = useMemo(() => {
//     const unique = Array.from(
//       new Set(
//         subjects
//           .map((s) => getLocalizedValue(s.grade__category__name as LocalizedValue, locale))
//           .filter((v): v is string => Boolean(v))
//       )
//     );
//     return [ALL, ...unique];
//   }, [subjects, locale]);

//   const filtered = useMemo(() => {
//     if (category === ALL) return subjects;
//     return subjects.filter(
//       (s) => getLocalizedValue(s.grade__category__name as LocalizedValue, locale) === category
//     );
//   }, [subjects, category, locale]);

//   const handleCancel = useCallback(() => {
//     isClosingRef.current = true;
//     requestIdRef.current += 1;

//     setIsModalOpen(false);
//     setBookLoading(false);
//     setBookError(null);
//     setPdfUrl(null);
//     lastOpenedSubjectIdRef.current = null;

//     replaceSubjectQuery(null);

//     setTimeout(() => {
//       isClosingRef.current = false;
//     }, 0);
//   }, [replaceSubjectQuery]);

//   const specificBookFetch = useCallback(
//     async (subjectID: number, gradeID: number, syncUrl = true) => {
//       const myRequestId = ++requestIdRef.current;

//       if (syncUrl) {
//         replaceSubjectQuery(subjectID);
//       }

//       lastOpenedSubjectIdRef.current = subjectID;
//       setIsModalOpen(true);
//       setBookLoading(true);
//       setBookError(null);
//       setPdfUrl(null);

//       const subjectTitle =
//         getLocalizedValue(
//           subjects.find((x) => x.pk === subjectID)?.name as LocalizedValue,
//           locale
//         ) || t("bookFallback");

//       setActiveTitle(`${subjectTitle} • PDF`);

//       try {
//         const res = await api.get<SubjectBookResponse>("/subjects/books/", {
//           params: {
//             subject_id: subjectID,
//             grade_id: gradeID,
//           },
//         });

//         if (!mountedRef.current || requestIdRef.current !== myRequestId) return;

//         const data = res?.data;
//         const url = data?.pdf_url;

//         if (!isNonEmptyString(url)) {
//           setBookError(t("noPdfFound"));
//           return;
//         }

//         setPdfUrl(url);
//       } catch (error: unknown) {
//         if (!mountedRef.current || requestIdRef.current !== myRequestId) return;

//         if (axios.isAxiosError(error)) {
//           const status = error.response?.status;
//           if (status === 404) {
//             setBookError(t("noPdfFound"));
//             return;
//           }
//         }

//         console.error(error);
//         setBookError(t("failedToLoadPdf"));
//         message.error(t("failedToLoadBookPdfToast"));
//       } finally {
//         if (!mountedRef.current || requestIdRef.current !== myRequestId) return;
//         setBookLoading(false);
//       }
//     },
//     [locale, replaceSubjectQuery, subjects, t]
//   );

//   useEffect(() => {
//     if (loading) return;
//     if (!openSubjectId || Number.isNaN(openSubjectId)) return;
//     if (isClosingRef.current) return;

//     const targetSubject = subjects.find((s) => s.pk === openSubjectId);
//     if (!targetSubject) return;

//     const targetCategory = getLocalizedValue(
//       targetSubject.grade__category__name as LocalizedValue,
//       locale
//     );

//     if (targetCategory && category !== ALL && category !== targetCategory) {
//       setCategory(targetCategory);
//     }

//     if (lastOpenedSubjectIdRef.current !== openSubjectId) {
//       void specificBookFetch(openSubjectId, targetSubject.grade__pk, false);
//     }
//   }, [loading, openSubjectId, subjects, locale, category, specificBookFetch]);

//   return (
//     <div className={styles.mainContainer}>
//       <div className={styles.pageHeader}>
//         <div className={styles.titleBlock}>
//           <div className={styles.titleRow}>
//             <span className={styles.headerIcon}>
//               <FaAtom className={styles.navIcon} />
//             </span>
//             <h1 className={styles.title}>{t("pageTitle")}</h1>
//           </div>
//           <p className={styles.subtitle}>{t("subtitle")}</p>
//         </div>

//         <div className={styles.controls}>
//           <Select
//             value={category}
//             onChange={(v) => setCategory(v)}
//             className={styles.categorySelect}
//             popupClassName={styles.categorySelectDropdown}
//             getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
//             options={categoryOptions.map((c) => ({
//               value: c,
//               label: c === ALL ? t("all") : c,
//             }))}
//           />
//         </div>
//       </div>

//       {loading ? (
//         <div className={styles.emptyState}>
//           <div className={styles.emptyTitle}>{t("loadingSubjects")}</div>
//         </div>
//       ) : (
//         <>
//           <div className={styles.grid}>
//             {filtered.map((s) => (
//               <button
//                 key={s.pk}
//                 type="button"
//                 className={styles.card}
//                 onClick={() => void specificBookFetch(s.pk, s.grade__pk)}
//               >
//                 <div className={styles.cardTop}>
//                   <div className={styles.cardTitle}>
//                     <span
//                       className={styles.subjectName}
//                       title={getLocalizedValue(s.name as LocalizedValue, locale)}
//                     >
//                       {getLocalizedValue(s.name as LocalizedValue, locale)}
//                     </span>
//                   </div>

//                   <span className={styles.categoryPill}>
//                     {getLocalizedValue(s.grade__category__name as LocalizedValue, locale)}
//                   </span>
//                 </div>

//                 <div className={styles.cardMeta}>
//                   <div className={styles.metaItem}>
//                     <span className={styles.metaLabel}>{t("grade")}</span>
//                     <span className={styles.metaValue}>
//                       {getLocalizedValue(s.grade__name as LocalizedValue, locale)}{" "}
//                       {getLocalizedValue(s.grade__category__name as LocalizedValue, locale)}
//                     </span>
//                   </div>
//                 </div>
//               </button>
//             ))}
//           </div>

//           {filtered.length === 0 && (
//             <div className={styles.emptyState}>
//               <div className={styles.emptyTitle}>{t("noResults")}</div>
//               <div className={styles.emptyText}>{t("tryChangingCategory")}</div>
//             </div>
//           )}

//           <Modal
//             title={activeTitle}
//             open={isModalOpen}
//             onCancel={handleCancel}
//             footer={null}
//             width="min(1100px, 94vw)"
//             centered
//             className={styles.bookModal}
//             destroyOnClose
//           >
//             <div className={styles.bookModalBody}>
//               {bookLoading ? (
//                 <div className={styles.bookLoading}>
//                   <Spin size="large" />
//                   <div className={styles.bookLoadingText}>
//                     {t("loadingPdf")}
//                   </div>
//                 </div>
//               ) : bookError ? (
//                 <div className={styles.bookError}>
//                   <Empty
//                     description={
//                       <span style={{ color: "grey", fontSize: "20px" }}>
//                         {t("empty")}
//                       </span>
//                     }
//                   />
//                 </div>
//               ) : isNonEmptyString(pdfUrl) ? (
//                 <>
//                   <div className={styles.bookTopBar}>
//                     <a
//                       className={styles.bookAction}
//                       href={pdfUrl}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                     >
//                       <FaExternalLinkAlt />
//                       {t("openInNewTab")}
//                     </a>
//                   </div>

//                   <div className={styles.pdfFrameWrap}>
//                     <iframe
//                       key={pdfUrl}
//                       src={pdfUrl}
//                       className={styles.pdfFrame}
//                       title={t("bookPdfTitle")}
//                     />
//                   </div>
//                 </>
//               ) : null}
//             </div>
//           </Modal>
//         </>
//       )}
//     </div>
//   );
// }








"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styles from "./subjects.module.scss";
import { Modal, message, Spin, Empty } from "antd";
import api from "@/interceptors";
import { FaAtom, FaExternalLinkAlt } from "react-icons/fa";
import { BackendSubject, SubjectBookResponse } from "./interface";
import axios from "axios";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LocalizedValue = string | Record<string, string> | null | undefined;

const ALL = "All";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getLocalizedValue(value: LocalizedValue, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] || value.ka || value.en || value.ru || "";
}

export default function Subjects() {
  const t = useTranslations("Subjects");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const locale = useMemo(() => pathname?.split("/")[1] || "en", [pathname]);

  const openSubjectId = useMemo(() => {
    const value = searchParams.get("openSubject");
    if (!value) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }, [searchParams]);

  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>(ALL);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("Book • PDF");

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastOpenedSubjectIdRef = useRef<number | null>(null);
  const isClosingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const replaceSubjectQuery = useCallback(
    (id?: number | null) => {
      const current = searchParams.get("openSubject");
      const next = id ? String(id) : null;

      if (current === next) return;

      const params = new URLSearchParams(searchParams.toString());

      if (id) {
        params.set("openSubject", String(id));
      } else {
        params.delete("openSubject");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    mountedRef.current = true;

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

    void fetchSubjects();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        subjects
          .map((s) => getLocalizedValue(s.grade__category__name as LocalizedValue, locale))
          .filter((v): v is string => Boolean(v))
      )
    );

    return [ALL, ...unique];
  }, [subjects, locale]);

  const filtered = useMemo(() => {
    if (category === ALL) return subjects;

    return subjects.filter(
      (s) => getLocalizedValue(s.grade__category__name as LocalizedValue, locale) === category
    );
  }, [subjects, category, locale]);

  const selectedCategoryLabel = useMemo(() => {
    return category === ALL ? t("all") : category;
  }, [category, t]);

  const handleCategorySelect = useCallback((value: string) => {
    setCategory((prev) => (prev === value ? prev : value));
    setIsDropdownOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const handleCancel = useCallback(() => {
    isClosingRef.current = true;
    requestIdRef.current += 1;

    setIsModalOpen(false);
    setBookLoading(false);
    setBookError(null);
    setPdfUrl(null);
    lastOpenedSubjectIdRef.current = null;

    replaceSubjectQuery(null);

    setTimeout(() => {
      isClosingRef.current = false;
    }, 0);
  }, [replaceSubjectQuery]);

  const openSubjectBook = useCallback(
    async (subject: BackendSubject, syncUrl = true) => {
      const myRequestId = ++requestIdRef.current;
      const subjectID = subject.pk;
      const gradeID = subject.grade__pk;

      if (syncUrl) {
        replaceSubjectQuery(subjectID);
      }

      lastOpenedSubjectIdRef.current = subjectID;
      setIsModalOpen(true);
      setBookLoading(true);
      setBookError(null);
      setPdfUrl(null);

      const subjectTitle =
        getLocalizedValue(subject.name as LocalizedValue, locale) || t("bookFallback");

      setActiveTitle(`${subjectTitle} • PDF`);

      try {
        const res = await api.get<SubjectBookResponse>("/subjects/books/", {
          params: {
            subject_id: subjectID,
            grade_id: gradeID,
          },
        });

        if (!mountedRef.current || requestIdRef.current !== myRequestId) return;

        const url = res?.data?.pdf_url;

        if (!isNonEmptyString(url)) {
          setBookError(t("noPdfFound"));
          return;
        }

        setPdfUrl(url);
      } catch (error: unknown) {
        if (!mountedRef.current || requestIdRef.current !== myRequestId) return;

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setBookError(t("noPdfFound"));
          return;
        }

        console.error(error);
        setBookError(t("failedToLoadPdf"));
        message.error(t("failedToLoadBookPdfToast"));
      } finally {
        if (!mountedRef.current || requestIdRef.current !== myRequestId) return;
        setBookLoading(false);
      }
    },
    [locale, replaceSubjectQuery, t]
  );

  const handleSubjectClick = useCallback(
    (subject: BackendSubject) => {
      void openSubjectBook(subject, true);
    },
    [openSubjectBook]
  );

  useEffect(() => {
    if (loading) return;
    if (!openSubjectId) return;
    if (isClosingRef.current) return;

    const targetSubject = subjects.find((s) => s.pk === openSubjectId);
    if (!targetSubject) return;

    if (lastOpenedSubjectIdRef.current === openSubjectId) return;

    void openSubjectBook(targetSubject, false);
  }, [loading, openSubjectId, subjects, openSubjectBook]);

  return (
    <div className={styles.mainContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.headerIcon}>
              <FaAtom className={styles.navIcon} />
            </span>
            <h1 className={styles.title}>{t("pageTitle")}</h1>
          </div>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        <div className={styles.controls}>
          <div ref={dropdownRef} className={styles.categoryDropdown}>
            <button
              type="button"
              className={`${styles.categoryDropdownTrigger} ${
                isDropdownOpen ? styles.categoryDropdownTriggerOpen : ""
              }`}
              onClick={toggleDropdown}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <span className={styles.categoryDropdownText}>
                {selectedCategoryLabel}
              </span>
              <span
                className={`${styles.categoryDropdownChevron} ${
                  isDropdownOpen ? styles.categoryDropdownChevronOpen : ""
                }`}
              >
                ▼
              </span>
            </button>

            {isDropdownOpen && (
              <div className={styles.categoryDropdownMenu} role="listbox">
                {categoryOptions.map((option) => {
                  const label = option === ALL ? t("all") : option;
                  const isActive = category === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.categoryDropdownItem} ${
                        isActive ? styles.categoryDropdownItemActive : ""
                      }`}
                      onClick={() => handleCategorySelect(option)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>{t("loadingSubjects")}</div>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {filtered.map((s) => (
              <button
                key={s.pk}
                type="button"
                className={styles.card}
                onClick={() => handleSubjectClick(s)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardTitle}>
                    <span
                      className={styles.subjectName}
                      title={getLocalizedValue(s.name as LocalizedValue, locale)}
                    >
                      {getLocalizedValue(s.name as LocalizedValue, locale)}
                    </span>
                  </div>

                  <span className={styles.categoryPill}>
                    {getLocalizedValue(s.grade__category__name as LocalizedValue, locale)}
                  </span>
                </div>

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("grade")}</span>
                    <span className={styles.metaValue}>
                      {getLocalizedValue(s.grade__name as LocalizedValue, locale)}{" "}
                      {getLocalizedValue(s.grade__category__name as LocalizedValue, locale)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>{t("noResults")}</div>
              <div className={styles.emptyText}>{t("tryChangingCategory")}</div>
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
                  <div className={styles.bookLoadingText}>{t("loadingPdf")}</div>
                </div>
              ) : bookError ? (
                <div className={styles.bookError}>
                  <Empty
                    description={
                      <span style={{ color: "grey", fontSize: "20px" }}>
                        {t("empty")}
                      </span>
                    }
                  />
                </div>
              ) : isNonEmptyString(pdfUrl) ? (
                <>
                  <div className={styles.bookTopBar}>
                    <a
                      className={styles.bookAction}
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaExternalLinkAlt />
                      {t("openInNewTab")}
                    </a>
                  </div>

                  <div className={styles.pdfFrameWrap}>
                    <iframe
                      key={pdfUrl}
                      src={pdfUrl}
                      className={styles.pdfFrame}
                      title={t("bookPdfTitle")}
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