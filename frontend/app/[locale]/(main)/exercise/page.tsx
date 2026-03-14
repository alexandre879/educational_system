// // "use client";

// // import { useCallback, useEffect, useMemo, useState } from "react";
// // import styles from "./exercise.module.scss";
// // import api from "@/interceptors";
// // import { FaBookOpen } from "react-icons/fa";
// // import { Exercise } from "./interface";
// // import { useTranslations } from "next-intl";

// // export default function ExercisePage() {
// //   const t = useTranslations("Exercise");

// //   const [loading, setLoading] = useState(true);
// //   const [items, setItems] = useState<Exercise[]>([]);
// //   const [userRole] = useState<string | null>(null);

// //   const [showCreate, setShowCreate] = useState(false);
// //   const [title, setTitle] = useState("");
// //   const [description, setDescription] = useState("");

// //   const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

// //   const load = useCallback(
// //     async (selectedDate?: string) => {
// //       try {
// //         setLoading(true);
// //         const res = await api.get("/exercises/daily/", {
// //           params: { date: selectedDate ?? todayISO },
// //         });

// //         setItems(res.data.items ?? []);
// //       } catch {
// //         setItems([]);
// //       } finally {
// //         setLoading(false);
// //       }
// //     },
// //     [todayISO]
// //   );

// //   const createExercise = useCallback(async () => {
// //     if (!title.trim()) return;

// //     await api.post("/exercises/daily/create/", {
// //       grade_id: items[0]?.grade?.id,
// //       date: todayISO,
// //       title,
// //       description,
// //     });

// //     setTitle("");
// //     setDescription("");
// //     setShowCreate(false);
// //     await load(todayISO);
// //   }, [title, items, todayISO, description, load]);

// //   useEffect(() => {
// //     load(todayISO);
// //   }, [load, todayISO]);

// //   return (
// //     <div className={styles.exerciseMainContainer}>
// //       <div className={styles.header}>
// //         <div className={styles.WrapperOfMainCaptionAndIcon}>
// //           <span className={styles.headerIcon}>
// //             <FaBookOpen className={styles.navIcon} />
// //           </span>
// //           <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
// //         </div>

// //         {userRole === "teacher" && (
// //           <button
// //             className={styles.createBtn}
// //             onClick={() => setShowCreate((p) => !p)}
// //           >
// //             + {t("addExercise")}
// //           </button>
// //         )}
// //       </div>

// //       {showCreate && (
// //         <div className={styles.createCard}>
// //           <input
// //             placeholder={t("exerciseTitlePlaceholder")}
// //             value={title}
// //             onChange={(e) => setTitle(e.target.value)}
// //             className={styles.input}
// //           />
// //           <textarea
// //             placeholder={t("descriptionPlaceholder")}
// //             value={description}
// //             onChange={(e) => setDescription(e.target.value)}
// //             className={styles.textarea}
// //           />
// //           <button className={styles.saveBtn} onClick={createExercise}>
// //             {t("save")}
// //           </button>
// //         </div>
// //       )}

// //       {loading ? (
// //         <div className={styles.empty}>{t("loadingExercises")}</div>
// //       ) : !items.length ? (
// //         <div className={styles.empty}>{t("noExercisesToday")}</div>
// //       ) : (
// //         <div className={styles.list}>
// //           {items.map((ex) => (
// //             <div key={ex.id} className={styles.card}>
// //               <div className={styles.cardHeader}>
// //                 <span className={styles.cardTitle}>{ex.title}</span>
// //                 {ex.subject && (
// //                   <span className={styles.subjectBadge}>
// //                     {ex.subject.name}
// //                   </span>
// //                 )}
// //               </div>

// //               {ex.description && (
// //                 <p className={styles.description}>{ex.description}</p>
// //               )}

// //               <div className={styles.meta}>
// //                 <span>
// //                   {t("gradeLabel")}: {ex.grade.name}
// //                 </span>
// //                 {ex.due_date && (
// //                   <span>
// //                     {t("dueLabel")}: {ex.due_date}
// //                   </span>
// //                 )}
// //               </div>
// //             </div>
// //           ))}
// //         </div>
// //       )}
// //     </div>
// //   );
// // }


// "use client";

// import { useEffect, useState, useCallback } from "react";
// import styles from "./exercise.module.scss";
// import api from "@/interceptors";
// import { FaBookOpen } from "react-icons/fa";
// import { Exercise } from "./interface";
// import { useTranslations } from "next-intl";

// function getTodayISO() {
//   return new Date().toISOString().split("T")[0];
// }

// export default function ExercisePage() {
//   const t = useTranslations("Exercise");

//   const [loading, setLoading] = useState(true);
//   const [items, setItems] = useState<Exercise[]>([]);
//   const [showCreate, setShowCreate] = useState(false);
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");

//   const userRole: string | null = null;
//   const todayISO = getTodayISO();

//   const loadExercises = useCallback(async (date = todayISO) => {
//     try {
//       setLoading(true);

//       const res = await api.get("/exercises/daily/", {
//         params: { date },
//       });

//       setItems(res.data?.items ?? []);
//     } catch {
//       setItems([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [todayISO]);

//   const resetCreateForm = () => {
//     setTitle("");
//     setDescription("");
//     setShowCreate(false);
//   };

//   const handleToggleCreate = () => {
//     setShowCreate((prev) => !prev);
//   };

//   const handleCreateExercise = async () => {
//     const trimmedTitle = title.trim();
//     const trimmedDescription = description.trim();

//     if (!trimmedTitle) return;

//     const gradeId = items[0]?.grade?.id;
//     if (!gradeId) return;

//     try {
//       await api.post("/exercises/daily/create/", {
//         grade_id: gradeId,
//         date: todayISO,
//         title: trimmedTitle,
//         description: trimmedDescription,
//       });

//       resetCreateForm();
//       await loadExercises(todayISO);
//     } 
//     catch {
//       // optionally show error later
//     }
//   };

//   useEffect(() => {
//     loadExercises();
//   }, [loadExercises]);

//   return (
//     <div className={styles.exerciseMainContainer}>
//       <div className={styles.header}>
//         <div className={styles.WrapperOfMainCaptionAndIcon}>
//           <span className={styles.headerIcon}>
//             <FaBookOpen className={styles.navIcon} />
//           </span>
//           <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//         </div>

//         {userRole === "teacher" && (
//           <button className={styles.createBtn} onClick={handleToggleCreate}>
//             + {t("addExercise")}
//           </button>
//         )}
//       </div>

//       {showCreate && (
//         <div className={styles.createCard}>
//           <input
//             placeholder={t("exerciseTitlePlaceholder")}
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             className={styles.input}
//           />

//           <textarea
//             placeholder={t("descriptionPlaceholder")}
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             className={styles.textarea}
//           />

//           <button className={styles.saveBtn} onClick={handleCreateExercise}>
//             {t("save")}
//           </button>
//         </div>
//       )}

//       {loading ? (
//         <div className={styles.empty}>{t("loadingExercises")}</div>
//       ) : items.length === 0 ? (
//         <div className={styles.empty}>{t("noExercisesToday")}</div>
//       ) : (
//         <div className={styles.list}>
//           {items.map((ex) => (
//             <div key={ex.id} className={styles.card}>
//               <div className={styles.cardHeader}>
//                 <span className={styles.cardTitle}>{ex.title}</span>

//                 {ex.subject && (
//                   <span className={styles.subjectBadge}>
//                     {ex.subject.name}
//                   </span>
//                 )}
//               </div>

//               {ex.description && (
//                 <p className={styles.description}>{ex.description}</p>
//               )}

//               <div className={styles.meta}>
//                 <span>
//                   {t("gradeLabel")}: {ex.grade.name}
//                 </span>

//                 {ex.due_date && (
//                   <span>
//                     {t("dueLabel")}: {ex.due_date}
//                   </span>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }















// "use client";

// import { useEffect, useState, useCallback } from "react";
// import styles from "./exercise.module.scss";
// import api from "@/interceptors";
// import { FaBookOpen } from "react-icons/fa";
// import { Exercise } from "./interface";
// import { useTranslations } from "next-intl";
// import { usePathname } from "next/navigation";

// type LocalizedValue = string | Record<string, string> | null | undefined;

// function getTodayISO() {
//   return new Date().toISOString().split("T")[0];
// }

// function getLocalizedValue(value: LocalizedValue, locale: string): string {
//   if (!value) return "";
//   if (typeof value === "string") return value;
//   return value[locale] || value.ka || value.en || value.ru || "";
// }

// export default function ExercisePage() {
//   const t = useTranslations("Exercise");
//   const pathname = usePathname();
//   const locale = pathname?.split("/")[1] || "en";

//   const [loading, setLoading] = useState(true);
//   const [items, setItems] = useState<Exercise[]>([]);
//   const [showCreate, setShowCreate] = useState(false);
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");

//   const userRole: string | null = null;
//   const todayISO = getTodayISO();

//   const loadExercises = useCallback(async (date = todayISO) => {
//     try {
//       setLoading(true);

//       const res = await api.get("/exercises/daily/", {
//         params: { date },
//       });

//       setItems(res.data?.items ?? []);
//     } catch {
//       setItems([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [todayISO]);

//   const resetCreateForm = () => {
//     setTitle("");
//     setDescription("");
//     setShowCreate(false);
//   };

//   const handleToggleCreate = () => {
//     setShowCreate((prev) => !prev);
//   };

//   const handleCreateExercise = async () => {
//     const trimmedTitle = title.trim();
//     const trimmedDescription = description.trim();

//     if (!trimmedTitle) return;

//     const gradeId = items[0]?.grade?.id;
//     if (!gradeId) return;

//     try {
//       await api.post("/exercises/daily/create/", {
//         grade_id: gradeId,
//         date: todayISO,
//         title: trimmedTitle,
//         description: trimmedDescription,
//       });

//       resetCreateForm();
//       await loadExercises(todayISO);
//     } catch {
//       // optionally show error later
//     }
//   };

//   useEffect(() => {
//     loadExercises();
//   }, [loadExercises]);

//   return (
//     <div className={styles.exerciseMainContainer}>
//       <div className={styles.header}>
//         <div className={styles.WrapperOfMainCaptionAndIcon}>
//           <span className={styles.headerIcon}>
//             <FaBookOpen className={styles.navIcon} />
//           </span>
//           <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//         </div>

//         {userRole === "teacher" && (
//           <button className={styles.createBtn} onClick={handleToggleCreate}>
//             + {t("addExercise")}
//           </button>
//         )}
//       </div>

//       {showCreate && (
//         <div className={styles.createCard}>
//           <input
//             placeholder={t("exerciseTitlePlaceholder")}
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             className={styles.input}
//           />

//           <textarea
//             placeholder={t("descriptionPlaceholder")}
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             className={styles.textarea}
//           />

//           <button className={styles.saveBtn} onClick={handleCreateExercise}>
//             {t("save")}
//           </button>
//         </div>
//       )}

//       {loading ? (
//         <div className={styles.empty}>{t("loadingExercises")}</div>
//       ) : items.length === 0 ? (
//         <div className={styles.empty}>{t("noExercisesToday")}</div>
//       ) : (
//         <div className={styles.list}>
//           {items.map((ex) => (
//             <div key={ex.id} className={styles.card}>
//               <div className={styles.cardHeader}>
//                 <span className={styles.cardTitle}>
//                   {getLocalizedValue(ex.title as LocalizedValue, locale)}
//                 </span>

//                 {ex.subject && (
//                   <span className={styles.subjectBadge}>
//                     {getLocalizedValue(ex.subject.name as LocalizedValue, locale)}
//                   </span>
//                 )}
//               </div>

//               {ex.description && (
//                 <p className={styles.description}>
//                   {getLocalizedValue(ex.description as LocalizedValue, locale)}
//                 </p>
//               )}

//               <div className={styles.meta}>
//                 <span>
//                   {t("gradeLabel")}: {getLocalizedValue(ex.grade.name as LocalizedValue, locale)}
//                 </span>

//                 {ex.due_date && (
//                   <span>
//                     {t("dueLabel")}: {ex.due_date}
//                   </span>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }













// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import styles from "./exercise.module.scss";
// import api from "@/interceptors";
// import { Button, Dropdown, Form, Input, List, Pagination, Select } from "antd";
// import TextArea from "antd/es/input/TextArea";
// import {
//   Announcement,
//   Subject,
//   CreateAnnouncementData,
//   Grades,
//   Categories,
//   Comment,
// } from "./interface";
// import { FiInbox } from "react-icons/fi";
// import { CommentOutlined } from "@ant-design/icons";
// import { FaBullhorn } from "react-icons/fa";
// import { useTranslations } from "next-intl";
// import { usePathname } from "next/navigation";

// type MaybeRecord = Record<string, unknown>;
// type LocalizedValue = string | Record<string, string> | null | undefined;

// function isRecord(v: unknown): v is MaybeRecord {
//   return typeof v === "object" && v !== null;
// }
// function getString(v: unknown): string | null {
//   if (typeof v === "string") return v;
//   if (typeof v === "number") return String(v);
//   return null;
// }
// function getRecord(v: unknown): MaybeRecord | null {
//   return isRecord(v) ? v : null;
// }
// function getLocalizedValue(value: LocalizedValue, locale: string): string {
//   if (!value) return "";
//   if (typeof value === "string") return value;
//   return value[locale] || value.ka || value.en || value.ru || "";
// }

// export default function AnnouncementPage() {
//   const t = useTranslations("Announcement");
//   const pathname = usePathname();
//   const locale = pathname?.split("/")[1] || "en";

//   const [announcements, setAnnouncements] = useState<Announcement[]>([]);
//   const [subjects, setSubjects] = useState<Subject[]>([]);
//   const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
//   const [, setGrades] = useState<Grades[] | null>(null);
//   const [userRole, setUserRole] = useState<string | null>(null);
//   const [, setCategories] = useState<Categories[] | null>(null);

//   const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
//   const [announcementId, setAnnoucementId] = useState<number | null>(null);
//   const [comments, setComments] = useState<Comment[]>([]);

//   const [showCreate, setShowCreate] = useState(false);
//   const [announcementForm] = Form.useForm();
//   const [commentForm] = Form.useForm();

//   const PAGE_SIZE = 10;
//   const [page, setPage] = useState(1);

//   const scrollToTop = () => {
//     const scroller = document.getElementById("app-scroll");
//     if (scroller) {
//       scroller.scrollTo({ top: 0, behavior: "smooth" });
//       return;
//     }
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const displayName = (v: unknown): string => {
//     if (v == null) return "";
//     if (typeof v === "string" || typeof v === "number") return String(v);

//     const obj = getRecord(v);
//     if (!obj) return "";

//     const name = obj.name;
//     if (name !== undefined) {
//       const localizedName = getLocalizedValue(name as LocalizedValue, locale);
//       if (localizedName) return localizedName;
//     }

//     const title = obj.title;
//     if (title !== undefined) {
//       const localizedTitle = getLocalizedValue(title as LocalizedValue, locale);
//       if (localizedTitle) return localizedTitle;
//     }

//     const email = getString(obj.email);
//     if (email) return email;

//     return "";
//   };

//   const getCreatedByEmail = (a: Announcement): string => {
//     const raw = (a as unknown as MaybeRecord).created_by;

//     const emailDirect = getString(raw);
//     if (emailDirect) return emailDirect;

//     const obj = getRecord(raw);
//     if (obj) {
//       const email = getString(obj.email);
//       if (email) return email;

//       const name = obj.name;
//       if (name !== undefined) {
//         const localizedName = getLocalizedValue(name as LocalizedValue, locale);
//         if (localizedName) return localizedName;
//       }
//     }
//     return displayName(raw);
//   };

//   const getGradeLabel = (a: Announcement): string => {
//     const raw = (a as unknown as MaybeRecord).grade;

//     const direct = getString(raw);
//     if (direct) return direct;

//     const obj = getRecord(raw);
//     if (!obj) return displayName(raw);

//     const gradeName = getLocalizedValue(obj.name as LocalizedValue, locale) ?? "";

//     const categoryName =
//       getLocalizedValue(obj.category_name as LocalizedValue, locale) ||
//       (getRecord(obj.category)
//         ? getLocalizedValue(getRecord(obj.category)?.name as LocalizedValue, locale)
//         : "") ||
//       "";

//     return categoryName ? `${gradeName} ${categoryName}` : gradeName;
//   };

//   const getCommentText = (c: Comment): string => {
//     const obj = getRecord(c);
//     if (!obj) return "";

//     const comment = getString(obj.comment);
//     if (comment) return comment;

//     const content = getString(obj.content);
//     if (content) return content;

//     return "";
//   };

//   const fetchComments = useCallback(async (id: number) => {
//     try {
//       const res = await api.get<Comment[]>("comments/", {
//         params: { announcement: id },
//       });
//       setComments(res.data);
//     } catch (error) {
//       console.log(error);
//       setComments([]);
//     }
//   }, []);

//   const onCommentSend = async (values: { comment: string }) => {
//     if (!values.comment || !announcementId) return;

//     try {
//       const res = await api.post<Comment>("comments/create/", {
//         comment: values.comment,
//         announcement: announcementId,
//       });

//       setComments((prev) => [...prev, res.data]);

//       setAnnouncements((prev) =>
//         prev.map((item) =>
//           item.id === announcementId
//             ? { ...item, len_comments: item.len_comments + 1 }
//             : item
//         )
//       );

//       if (selectedAnnouncement?.id === announcementId) {
//         setSelectedAnnouncement((prev) =>
//           prev ? { ...prev, len_comments: prev.len_comments + 1 } : prev
//         );
//       }

//       commentForm.resetFields();
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const fetchAnnouncements = useCallback(
//     async (subjectId?: number) => {
//       try {
//         const response = await api.get("announcements/list/", {
//           params: subjectId ? { subject: subjectId } : {},
//         });

//         const data = response.data as MaybeRecord;

//         const fetchedAnnouncements = (data.announcements as Announcement[]) ?? [];
//         const fetchedSubjects = (data.subjects as Subject[]) ?? [];
//         const categories = (data.categories as Categories[]) ?? [];
//         const grades = (data.grades as Grades[]) ?? [];
//         const role = (data.role as string) ?? null;

//         setCategories(categories);
//         setGrades(grades);
//         setUserRole(role);
//         setAnnouncements(fetchedAnnouncements);
//         setSubjects(fetchedSubjects);

//         setPage(1);
//         scrollToTop();

//         if (fetchedAnnouncements.length > 0) {
//           const keepSelected = selectedAnnouncement
//             ? fetchedAnnouncements.find((x) => x.id === selectedAnnouncement.id)
//             : null;

//           const target = keepSelected ?? fetchedAnnouncements[0];
//           setSelectedAnnouncement(target);
//           setAnnoucementId(target.id);
//           await fetchComments(target.id);
//         } else {
//           setSelectedAnnouncement(null);
//           setAnnoucementId(null);
//           setComments([]);
//         }
//       } catch (error) {
//         console.error("Error fetching announcements:", error);
//       }
//     },
//     [fetchComments, selectedAnnouncement]
//   );

//   const createAnnouncement = async (data: CreateAnnouncementData) => {
//     try {
//       const res = await api.post<Announcement>("announcements/create/", data);

//       setAnnouncements((prev) => [res.data, ...prev]);
//       setSelectedAnnouncement(res.data);
//       setAnnoucementId(res.data.id);
//       setComments([]);
//       setPage(1);
//       scrollToTop();
//     } catch (error) {
//       console.error("Error creating announcement:", error);
//     }
//   };

//   const handleCreateSubmit = async () => {
//     try {
//       const values = await announcementForm.validateFields();
//       if (!values.subject) return;

//       const [subjectID, sgID, sgcID] = String(values.subject).split("-");

//       const payload: CreateAnnouncementData = {
//         title: values.title,
//         content: values.content,
//         subject_id: +subjectID,
//         grade_id: +sgID,
//         category_id: +sgcID,
//       };

//       await createAnnouncement(payload);

//       announcementForm.resetFields();
//       setShowCreate(false);
//     } catch (error) {
//       console.log("Validation failed:", error);
//     }
//   };

//   const selectAnnouncement = async (item: Announcement) => {
//     setSelectedAnnouncement(item);
//     setAnnoucementId(item.id);
//     await fetchComments(item.id);
//   };

//   useEffect(() => {
//     fetchAnnouncements(selectedSubjectId);
//   }, [selectedSubjectId, fetchAnnouncements]);

//   const sortedAnnouncements = useMemo(() => {
//     return announcements
//       .slice()
//       .sort(
//         (a, b) =>
//           new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//       );
//   }, [announcements]);

//   useEffect(() => {
//     const maxPage = Math.max(1, Math.ceil(sortedAnnouncements.length / PAGE_SIZE));
//     if (page > maxPage) setPage(1);
//   }, [sortedAnnouncements.length, page]);

//   const pagedAnnouncements = useMemo(() => {
//     const start = (page - 1) * PAGE_SIZE;
//     return sortedAnnouncements.slice(start, start + PAGE_SIZE);
//   }, [sortedAnnouncements, page]);

//   const selectedSubjectLabel = useMemo(() => {
//     if (!selectedSubjectId) return t("allSubjects");
//     const subject = subjects.find((s) => s.id === selectedSubjectId);
//     if (!subject) return t("chooseSubject");

//     return `${getLocalizedValue(
//       subject.name as LocalizedValue,
//       locale
//     )} (${getLocalizedValue(
//       subject.grade.grade_name as LocalizedValue,
//       locale
//     )} ${getLocalizedValue(
//       subject.grade.grade_category_name as LocalizedValue,
//       locale
//     )})`;
//   }, [selectedSubjectId, subjects, t, locale]);

//   const sortedComments = useMemo(() => {
//     return comments
//       .slice()
//       .sort(
//         (a, b) =>
//           new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//       );
//   }, [comments]);

//   return (
//     <div className={styles.dropDownWrapper}>
//       <div className={styles.ButtonDropdownWrapper}>
//         <div className={styles.WrapperOfMainCaptionAndIcon}>
//           <span className={styles.headerIcon}>
//             <FaBullhorn className={styles.navIcon} />
//           </span>
//           <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//         </div>

//         <div className={styles.dropDownAndButtonWrapper}>
//           {userRole === "teacher" && (
//             <Button type="primary" onClick={() => setShowCreate((prev) => !prev)}>
//               {showCreate ? t("cancel") : t("addAnnouncement")}
//             </Button>
//           )}

//           <Dropdown
//             overlayClassName={styles.glassDropdown}
//             popupRender={(menu) => (
//               <div className={styles.dropdownPopupShell}>
//                 <div className={styles.dropdownScrollWrapper}>{menu}</div>
//               </div>
//             )}
//             menu={{
//               items: [
//                 {
//                   key: "all",
//                   label: t("allSubjects"),
//                   onClick: () => setSelectedSubjectId(undefined),
//                 },
//                 ...subjects.map((s) => ({
//                   key: String(s.id),
//                   label: `${getLocalizedValue(
//                     s.name as LocalizedValue,
//                     locale
//                   )} (${getLocalizedValue(
//                     s.grade.grade_name as LocalizedValue,
//                     locale
//                   )} ${getLocalizedValue(
//                     s.grade.grade_category_name as LocalizedValue,
//                     locale
//                   )})`,
//                   onClick: () => setSelectedSubjectId(s.id),
//                 })),
//               ],
//             }}
//             placement="bottomCenter"
//             trigger={["click"]}
//             arrow={{ pointAtCenter: true }}
//             getPopupContainer={(triggerNode) =>
//               triggerNode.parentElement || document.body
//             }
//           >
//             <Button className={styles.filterButton}>
//               {selectedSubjectLabel}
//               <span className={styles.filterChevron}>▼</span>
//             </Button>
//           </Dropdown>
//         </div>
//       </div>

//       {showCreate && userRole === "teacher" && (
//         <div className={styles.composerCard}>
//           <Form form={announcementForm} layout="vertical">
//             <Form.Item
//               label={t("formTitleLabel")}
//               name="title"
//               rules={[{ required: true, message: t("validationEnterTitle") }]}
//             >
//               <Input placeholder={t("titlePlaceholder")} />
//             </Form.Item>

//             <Form.Item
//               label={t("formSubjectLabel")}
//               name="subject"
//               rules={[{ required: true, message: t("validationSelectSubject") }]}
//             >
//               <Select
//                 placeholder={t("subjectPlaceholder")}
//                 options={subjects.map((s) => ({
//                   value: `${s.id}-${s.grade.grade_id}-${s.grade.grade_category_id}`,
//                   label: `${getLocalizedValue(
//                     s.name as LocalizedValue,
//                     locale
//                   )} (${getLocalizedValue(
//                     s.grade.grade_name as LocalizedValue,
//                     locale
//                   )} ${getLocalizedValue(
//                     s.grade.grade_category_name as LocalizedValue,
//                     locale
//                   )})`,
//                 }))}
//               />
//             </Form.Item>

//             <Form.Item
//               label={t("formContentLabel")}
//               name="content"
//               rules={[{ required: true, message: t("validationEnterContent") }]}
//             >
//               <TextArea rows={4} placeholder={t("contentPlaceholder")} />
//             </Form.Item>

//             <div className={styles.composerActions}>
//               <Button onClick={() => setShowCreate(false)}>{t("cancel")}</Button>
//               <Button type="primary" onClick={handleCreateSubmit}>
//                 {t("submit")}
//               </Button>
//             </div>
//           </Form>
//         </div>
//       )}

//       <div className={styles.communicationLayout}>
//         <div className={styles.leftPane}>
//           <div className={styles.announcementList}>
//             {sortedAnnouncements.length > 0 ? (
//               <>
//                 {pagedAnnouncements.map((item) => {
//                   const active = selectedAnnouncement?.id === item.id;

//                   return (
//                     <div
//                       key={item.id}
//                       className={`${styles.announcementCard} ${active ? styles.activeAnnouncementCard : ""}`}
//                       onClick={() => selectAnnouncement(item)}
//                     >
//                       <div className={styles.announcementHeader}>
//                         <div className={styles.titleAndCommentsWrapper}>
//                           <h3 className={styles.announcementTitle}>
//                             {displayName(item.title)}
//                           </h3>
//                         </div>

//                         <span className={styles.announcementDate}>
//                           <u>{new Date(item.created_at).toLocaleString()}</u>

//                           <div className={styles.commentsWrapper}>
//                             <CommentOutlined />
//                             <span className={styles.commentsCountStyle}>
//                               {item.len_comments}
//                             </span>
//                           </div>
//                         </span>
//                       </div>

//                       <div className={styles.announcementMeta}>
//                         <span className={styles.metaItem}>
//                           <strong>{t("author")}:</strong> {getCreatedByEmail(item)}
//                         </span>
//                         <span className={styles.metaItem}>
//                           <strong>{t("subject")}:</strong> {displayName(item.subject)}
//                         </span>
//                         <span className={styles.metaItem}>
//                           <strong>{t("grade")}:</strong> {getGradeLabel(item)}
//                         </span>
//                       </div>

//                       <p className={styles.announcementContent}>
//                         {displayName(item.content)}
//                       </p>
//                     </div>
//                   );
//                 })}

//                 {sortedAnnouncements.length > PAGE_SIZE ? (
//                   <div className={styles.paginationWrapper}>
//                     <Pagination
//                       current={page}
//                       pageSize={PAGE_SIZE}
//                       total={sortedAnnouncements.length}
//                       onChange={(p) => {
//                         setPage(p);
//                         scrollToTop();
//                         setPage(p);
//                       }}
//                       showSizeChanger={false}
//                       showQuickJumper={false}
//                     />
//                   </div>
//                 ) : null}
//               </>
//             ) : (
//               <div className={styles.emptyAnnouncementWrapper}>
//                 {t("empty")}
//                 <FiInbox size={48} />
//               </div>
//             )}
//           </div>
//         </div>

//         <div className={styles.rightPane}>
//           {selectedAnnouncement ? (
//             <div className={styles.threadCard}>
//               <div className={styles.threadHeader}>
//                 <h2 className={styles.threadTitle}>
//                   {displayName(selectedAnnouncement.title)}
//                 </h2>

//                 <div className={styles.threadMeta}>
//                   <span className={styles.metaItem}>
//                     <strong>{t("author")}:</strong> {getCreatedByEmail(selectedAnnouncement)}
//                   </span>
//                   <span className={styles.metaItem}>
//                     <strong>{t("subject")}:</strong> {displayName(selectedAnnouncement.subject)}
//                   </span>
//                   <span className={styles.metaItem}>
//                     <strong>{t("grade")}:</strong> {getGradeLabel(selectedAnnouncement)}
//                   </span>
//                 </div>
//               </div>

//               <div className={styles.threadContent}>
//                 {displayName(selectedAnnouncement.content)}
//               </div>

//               <div className={styles.threadCommentsBlock}>
//                 <List
//                   size="small"
//                   bordered
//                   dataSource={sortedComments}
//                   className={styles.commentsList}
//                   renderItem={(item: Comment) => (
//                     <List.Item className={styles.commentItem}>
//                       <div className={styles.outerWrapper}>
//                         <div className={styles.innerCommentItemSectionWrapper}>
//                           <div>
//                             <u className={styles.insideCommentsAuthorStyle}>
//                               {displayName((item as unknown as MaybeRecord).user)}
//                             </u>
//                           </div>
//                           <span className={styles.commentsDateTimeStyle}>
//                             {new Date(item.created_at).toLocaleString()}
//                           </span>
//                         </div>
//                         <span className={styles.commentStyle}>{getCommentText(item)}</span>
//                       </div>
//                     </List.Item>
//                   )}
//                   locale={{
//                     emptyText: (
//                       <span style={{ color: "rgb(77, 77, 77)", fontWeight: 700 }}>
//                         {t("noCommentsYet")}
//                       </span>
//                     ),
//                   }}
//                 />
//               </div>

//               <div className={styles.replyComposer}>
//                 <Form
//                   form={commentForm}
//                   layout="inline"
//                   onFinish={onCommentSend}
//                   style={{ width: "100%" }}
//                 >
//                   <Form.Item
//                     name="comment"
//                     style={{ flex: 1 }}
//                     rules={[{ required: true, message: t("validationTypeSomething") }]}
//                   >
//                     <Input placeholder={t("commentPlaceholder")} />
//                   </Form.Item>

//                   <Form.Item>
//                     <Button type="primary" htmlType="submit">
//                       {t("send")}
//                     </Button>
//                   </Form.Item>
//                 </Form>
//               </div>
//             </div>
//           ) : (
//             <div className={styles.threadEmpty}>
//               <FiInbox size={42} />
//               <span>{t("empty")}</span>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }














"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./exercise.module.scss";
import api from "@/interceptors";
import { FaBookOpen } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Button, Select } from "antd";

type LocalizedValue = string | Record<string, string> | null | undefined;

interface Exercise {
  id: number;
  title: LocalizedValue;
  description?: LocalizedValue | null;
  due_date?: string | null;
  grade: {
    id: number;
    name: LocalizedValue;
    category_name?: LocalizedValue | null;
  };
  subject?: {
    id: number;
    name: LocalizedValue;
  } | null;
}

interface ExerciseResponse {
  items: Exercise[];
  role?: string | null;
}

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function getLocalizedValue(value: LocalizedValue, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] || value.ka || value.en || value.ru || "";
}

export default function ExercisePage() {
  const t = useTranslations("Exercise");
  const pathname = usePathname();
  const locale = pathname?.split("/")[1] || "en";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Exercise[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const todayISO = getTodayISO();

  const loadExercises = useCallback(async (date = todayISO) => {
    try {
      setLoading(true);

      const res = await api.get<ExerciseResponse>("/exercises/daily/", {
        params: { date },
      });

      setItems(res.data?.items ?? []);
      setUserRole(res.data?.role ?? null);
    } catch (error) {
      console.log(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [todayISO]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setShowCreate(false);
  };

  const handleToggleCreate = () => {
    setShowCreate((prev) => !prev);
  };

  const handleCreateExercise = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) return;

    const gradeId = items[0]?.grade?.id;
    if (!gradeId) return;

    try {
      await api.post("/exercises/daily/create/", {
        grade_id: gradeId,
        date: todayISO,
        title: trimmedTitle,
        description: trimmedDescription,
      });

      resetCreateForm();
      await loadExercises(todayISO);
    } catch (error) {
      console.log(error);
    }
  };

  const subjectOptions = useMemo(() => {
    const map = new Map<number, string>();

    items.forEach((item) => {
      if (item.subject?.id) {
        map.set(
          item.subject.id,
          getLocalizedValue(item.subject.name, locale) || t("unknownSubject")
        );
      }
    });

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [items, locale, t]);

  const filteredItems = useMemo(() => {
    if (!selectedSubjectId) return items;
    return items.filter((item) => item.subject?.id === selectedSubjectId);
  }, [items, selectedSubjectId]);

  const getGradeLabel = (exercise: Exercise) => {
    const gradeName = getLocalizedValue(exercise.grade?.name, locale);
    const categoryName = getLocalizedValue(exercise.grade?.category_name, locale);

    return categoryName ? `${gradeName} ${categoryName}` : gradeName;
  };

  return (
    <div className={styles.exerciseMainContainer}>
      <div className={styles.header}>
        <div className={styles.WrapperOfMainCaptionAndIcon}>
          <span className={styles.headerIcon}>
            <FaBookOpen className={styles.navIcon} />
          </span>
          <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {subjectOptions.length > 0 && (
            <Select
              allowClear
              placeholder={t("subjectPlaceholder")}
              value={selectedSubjectId ?? undefined}
              onChange={(value) => setSelectedSubjectId(value ?? null)}
              style={{ minWidth: 220 }}
              options={subjectOptions}
            />
          )}

          {userRole === "teacher" && (
            <button className={styles.createBtn} onClick={handleToggleCreate}>
              {showCreate ? t("cancel") : `+ ${t("addExercise")}`}
            </button>
          )}
        </div>
      </div>

      {showCreate && userRole === "teacher" && (
        <div className={styles.createCard}>
          <input
            placeholder={t("exerciseTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />

          <textarea
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
          />

          <button className={styles.saveBtn} onClick={handleCreateExercise}>
            {t("save")}
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>{t("loadingExercises")}</div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.empty}>
          {selectedSubjectId ? t("noExercisesForSubject") : t("noExercisesToday")}
        </div>
      ) : (
        <div className={styles.list}>
          {filteredItems.map((ex) => (
            <div key={ex.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>
                  {getLocalizedValue(ex.title, locale)}
                </span>

                {ex.subject && (
                  <span className={styles.subjectBadge}>
                    {getLocalizedValue(ex.subject.name, locale)}
                  </span>
                )}
              </div>

              {ex.description && (
                <p className={styles.description}>
                  {getLocalizedValue(ex.description, locale)}
                </p>
              )}

              <div className={styles.meta}>
                <span>
                  {t("gradeLabel")}: {getGradeLabel(ex)}
                </span>

                {ex.due_date && (
                  <span>
                    {t("dueLabel")}: {ex.due_date}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}