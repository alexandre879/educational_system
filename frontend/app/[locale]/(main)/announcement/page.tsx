

// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import styles from "./announcement.module.scss";
// import api from "@/interceptors";
// import { Button, Dropdown, Form, Input, List, Modal, Select, Pagination } from "antd";
// import TextArea from "antd/es/input/TextArea";
// import { Announcement, Subject, CreateAnnouncementData, Grades, Categories, Comment } from "./interface";
// import { FiInbox } from "react-icons/fi";
// import { CommentOutlined } from "@ant-design/icons";
// import { FaBullhorn } from "react-icons/fa";
// import { useTranslations } from "next-intl";

// type MaybeRecord = Record<string, unknown>;

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

// export default function AnnouncementPage() {
//   const t = useTranslations("Announcement");

//   const [announcements, setAnnouncements] = useState<Announcement[]>([]);
//   const [subjects, setSubjects] = useState<Subject[]>([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
//   const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
//   const [, setGrades] = useState<Grades[] | null>(null);
//   const [userRole, setUserRole] = useState<string | null>(null);
//   const [, setCategories] = useState<Categories[] | null>(null);
//   const [announcementModalCaption, setAnnouncementModalCaption] = useState<string | null>(null);
//   const [announcementId, setAnnoucementId] = useState<number | null>(null);
//   const [comments, setComments] = useState<Comment[]>([]);

//   const [announcementForm] = Form.useForm();
//   const [commentForm] = Form.useForm();

//   const PAGE_SIZE = 10;
//   const [page, setPage] = useState(1);

//   const scrollToTop = () => {
//     const scroller = document.querySelector(".childrenPassingContainer") as HTMLElement | null;

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

//     const name = getString(obj.name);
//     if (name) return name;

//     const title = getString(obj.title);
//     if (title) return title;

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
//       const name = getString(obj.name);
//       if (name) return name;
//     }
//     return displayName(raw);
//   };

//   const getGradeLabel = (a: Announcement): string => {
//     const raw = (a as unknown as MaybeRecord).grade;

//     const direct = getString(raw);
//     if (direct) return direct;

//     const obj = getRecord(raw);
//     if (!obj) return displayName(raw);

//     const gradeName = getString(obj.name) ?? "";
//     const categoryName =
//       getString(obj.category_name) ??
//       (getRecord(obj.category) ? getString(getRecord(obj.category)?.name) : null) ??
//       "";

//     return categoryName ? `${gradeName} (${categoryName})` : gradeName;
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
//           item.id === announcementId ? { ...item, len_comments: item.len_comments + 1 } : item
//         )
//       );

//       commentForm.resetFields();
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const showModal = () => setIsModalOpen(true);

//   const handleCancel = () => {
//     announcementForm.resetFields();
//     setIsModalOpen(false);
//   };

//   const showSectionModal = async (caption: string, id: number) => {
//     setAnnouncementModalCaption(caption);
//     setAnnoucementId(id);
//     setIsSectionModalOpen(true);

//     try {
//       const res = await api.get<Comment[]>("comments/", {
//         params: { announcement: id },
//       });
//       setComments(res.data);
//     } catch (error) {
//       console.log(error);
//       setComments([]);
//     }
//   };

//   const handleSectionModalCancel = () => {
//     setIsSectionModalOpen(false);
//   };

//   const fetchAnnouncements = useCallback(async (subjectId?: number) => {
//     try {
//       const response = await api.get("announcements/list/", {
//         params: subjectId ? { subject: subjectId } : {},
//       });

//       const data = response.data as MaybeRecord;

//       const fetchedAnnouncements = (data.announcements as Announcement[]) ?? [];
//       const fetchedSubjects = (data.subjects as Subject[]) ?? [];
//       const categories = (data.categories as Categories[]) ?? [];
//       const grades = (data.grades as Grades[]) ?? [];
//       const role = (data.role as string) ?? null;

//       setCategories(categories);
//       setGrades(grades);
//       setUserRole(role);
//       setAnnouncements(fetchedAnnouncements);
//       setSubjects(fetchedSubjects);

//       setPage(1);
//       scrollToTop();
//     } catch (error) {
//       console.error("Error fetching announcements:", error);
//     }
//   }, []);

//   const createAnnouncement = async (data: CreateAnnouncementData) => {
//     try {
//       const res = await api.post<Announcement>("announcements/create/", data);
//       setAnnouncements((prev) => [...prev, res.data]);
//       setPage(1);
//       scrollToTop();
//     } catch (error) {
//       console.error("Error creating announcement:", error);
//     }
//   };

//   const handleOk = async () => {
//     try {
//       const values = await announcementForm.validateFields();
//       if (!values.subject) return;

//       const [sName, sgID, sgcID] = String(values.subject).split("-");

//       const payload: CreateAnnouncementData = {
//         title: values.title,
//         content: values.content,
//         subject_name: sName,
//         grade_id: +sgID,
//         category_id: +sgcID,
//       };

//       await createAnnouncement(payload);

//       announcementForm.resetFields();
//       setIsModalOpen(false);
//     } catch (error) {
//       console.log("Validation failed:", error);
//     }
//   };

//   useEffect(() => {
//     fetchAnnouncements(selectedSubjectId);
//   }, [selectedSubjectId, fetchAnnouncements]);

//   const sortedAnnouncements = useMemo(() => {
//     return announcements
//       .slice()
//       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
//     return subjects.find((s) => s.id === selectedSubjectId)?.name ?? t("chooseSubject");
//   }, [selectedSubjectId, subjects, t]);

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
//             <Button type="primary" onClick={showModal}>
//               {t("addAnnouncement")}
//             </Button>
//           )}

//           <Dropdown
//             popupRender={(menu) => <div style={{ maxHeight: 200, overflowY: "auto" }}>{menu}</div>}
//             menu={{
//               items: [
//                 {
//                   key: "all",
//                   label: t("allSubjects"),
//                   onClick: () => setSelectedSubjectId(undefined),
//                 },
//                 ...subjects.map((s) => ({
//                   key: String(s.id),
//                   label: `${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`,
//                   onClick: () => setSelectedSubjectId(s.id),
//                 })),
//               ],
//             }}
//             placement="bottomLeft"
//             trigger={["click"]}
//             arrow={{ pointAtCenter: true }}
//           >
//             <Button className={styles.filterButton}>
//               {selectedSubjectLabel}
//               <span className={styles.filterChevron}>▼</span>
//             </Button>
//           </Dropdown>
//         </div>
//       </div>

//       <Modal
//         title={t("createAnnouncementTitle")}
//         open={isModalOpen}
//         onOk={handleOk}
//         onCancel={handleCancel}
//         okText={t("submit")}
//       >
//         <Form form={announcementForm} layout="vertical">
//           <Form.Item
//             label={t("formTitleLabel")}
//             name="title"
//             rules={[{ required: true, message: t("validationEnterTitle") }]}
//           >
//             <Input placeholder={t("titlePlaceholder")} />
//           </Form.Item>

//           <Form.Item
//             label={t("formSubjectLabel")}
//             name="subject"
//             rules={[{ required: true, message: t("validationSelectSubject") }]}
//           >
//             <Select placeholder={t("subjectPlaceholder")}>
//               {subjects.map((s) => (
//                 <Select.Option key={s.id} value={`${s.name}-${s.grade.grade_id}-${s.grade.grade_category_id}`}>
//                   {`${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`}
//                 </Select.Option>
//               ))}
//             </Select>
//           </Form.Item>

//           <Form.Item
//             label={t("formContentLabel")}
//             name="content"
//             rules={[{ required: true, message: t("validationEnterContent") }]}
//           >
//             <TextArea rows={4} placeholder={t("contentPlaceholder")} />
//           </Form.Item>
//         </Form>
//       </Modal>

//       <div className={styles.announcementList}>
//         {sortedAnnouncements.length > 0 ? (
//           <>
//             {pagedAnnouncements.map((item) => (
//               <div
//                 key={item.id}
//                 className={styles.announcementCard}
//                 onClick={() => showSectionModal(item.title, item.id)}
//               >
//                 <div className={styles.announcementHeader}>
//                   <div className={styles.titleAndCommentsWrapper}>
//                     <h3 className={styles.announcementTitle}>{item.title}</h3>
//                   </div>

//                   <span className={styles.announcementDate}>
//                     <u>{new Date(item.created_at).toLocaleString()}</u>

//                     <div className={styles.commentsWrapper}>
//                       <CommentOutlined />
//                       <span className={styles.commentsCountStyle}>{item.len_comments}</span>
//                     </div>
//                   </span>
//                 </div>

//                 <div className={styles.announcementMeta}>
//                   <span className={styles.metaItem}>
//                     <strong>{t("author")}:</strong> {getCreatedByEmail(item)}
//                   </span>
//                   <span className={styles.metaItem}>
//                     <strong>{t("subject")}:</strong> {displayName(item.subject)}
//                   </span>
//                   <span className={styles.metaItem}>
//                     <strong>{t("grade")}:</strong> {getGradeLabel(item)}
//                   </span>
//                 </div>

//                 <p className={styles.announcementContent}>{item.content}</p>
//               </div>
//             ))}

//             {sortedAnnouncements.length > PAGE_SIZE ? (
//               <div className={styles.paginationWrapper}>
//                 <Pagination
//                   current={page}
//                   pageSize={PAGE_SIZE}
//                   total={sortedAnnouncements.length}
//                   onChange={(p) => {
//                     setPage(p);
//                     scrollToTop();
//                   }}
//                   showSizeChanger={false}
//                   showQuickJumper={false}
//                 />
//               </div>
//             ) : null}
//           </>
//         ) : (
//           <div className={styles.emptyAnnouncementWrapper}>
//             {t("empty")}
//             <FiInbox size={48} />
//           </div>
//         )}
//       </div>

//       <Modal
//         title={`${announcementModalCaption ?? ""}`}
//         open={isSectionModalOpen}
//         onCancel={handleSectionModalCancel}
//         footer={null}
//       >
//         <List
//           size="small"
//           bordered
//           dataSource={comments
//             .slice()
//             .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
//           className={styles.commentsList}
//           renderItem={(item: Comment) => (
//             <List.Item className={styles.commentItem}>
//               <div className={styles.outerWrapper}>
//                 <div className={styles.innerCommentItemSectionWrapper}>
//                   <div>
//                     <u className={styles.insideCommentsAuthorStyle}>
//                       {displayName((item as unknown as MaybeRecord).user)}
//                     </u>
//                   </div>
//                   <span className={styles.commentsDateTimeStyle}>
//                     {new Date(item.created_at).toLocaleString()}
//                   </span>
//                 </div>
//                 <span className={styles.commentStyle}>{getCommentText(item)}</span>
//               </div>
//             </List.Item>
//           )}
//           locale={{
//             emptyText: (
//               <span style={{ color: "rgb(77, 77, 77)", fontWeight: 700 }}>
//                 {t("noCommentsYet")}
//               </span>
//             ),
//           }}
//         />

//         <Form form={commentForm} layout="inline" onFinish={onCommentSend} style={{ width: "100%" }}>
//           <Form.Item
//             name="comment"
//             style={{ flex: 1 }}
//             rules={[{ required: true, message: t("validationTypeSomething") }]}
//           >
//             <Input placeholder={t("commentPlaceholder")} />
//           </Form.Item>

//           <Form.Item>
//             <Button type="primary" htmlType="submit">
//               {t("send")}
//             </Button>
//           </Form.Item>
//         </Form>
//       </Modal>
//     </div>
//   );
// }





























// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import styles from "./announcement.module.scss";
// import api from "@/interceptors";
// import { Button, Dropdown, Form, Input, List, Modal, Select, Pagination } from "antd";
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

// type MaybeRecord = Record<string, unknown>;

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

// export default function AnnouncementPage() {
//   const t = useTranslations("Announcement");

//   const [announcements, setAnnouncements] = useState<Announcement[]>([]);
//   const [subjects, setSubjects] = useState<Subject[]>([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
//   const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
//   const [, setGrades] = useState<Grades[] | null>(null);
//   const [userRole, setUserRole] = useState<string | null>(null);
//   const [, setCategories] = useState<Categories[] | null>(null);
//   const [announcementModalCaption, setAnnouncementModalCaption] = useState<string | null>(null);
//   const [announcementId, setAnnoucementId] = useState<number | null>(null);
//   const [comments, setComments] = useState<Comment[]>([]);

//   const [announcementForm] = Form.useForm();
//   const [commentForm] = Form.useForm();

//   const PAGE_SIZE = 10;
//   const [page, setPage] = useState(1);

//   // ---------------------------
//   // ✅ Scroll helpers
//   // ---------------------------
//   const getScroller = () =>
//     document.querySelector(".childrenPassingContainer") as HTMLElement | null;

//   const scrollToTop = (behavior: ScrollBehavior = "smooth") => {
//     const scroller = getScroller();
//     if (scroller) {
//       scroller.scrollTo({ top: 0, behavior });
//       return;
//     }
//     window.scrollTo({ top: 0, behavior });
//   };

//   const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
//     const scroller = getScroller();
//     if (scroller) {
//       scroller.scrollTo({ top: scroller.scrollHeight, behavior });
//       return;
//     }
//     window.scrollTo({ top: document.body.scrollHeight, behavior });
//   };

//   /**
//    * ✅ Scroll inside AntD Modal content (comments modal)
//    * AntD modal body has its own scroll when content is long.
//    */
//   const scrollCommentsModalToBottom = () => {
//     const modalBody = document.querySelector(
//       ".ant-modal-body"
//     ) as HTMLElement | null;

//     if (modalBody) {
//       modalBody.scrollTo({ top: modalBody.scrollHeight, behavior: "smooth" });
//       return;
//     }

//     // fallback
//     scrollToBottom();
//   };

//   /**
//    * ✅ wait for DOM paint + modal mount
//    */
//   const safeScrollCommentsModalToBottom = () => {
//     requestAnimationFrame(() => {
//       // small delay helps because AntD mounts with animation
//       setTimeout(() => {
//         scrollCommentsModalToBottom();
//       }, 80);
//     });
//   };

//   // ---------------------------
//   // Display helpers
//   // ---------------------------
//   const displayName = (v: unknown): string => {
//     if (v == null) return "";
//     if (typeof v === "string" || typeof v === "number") return String(v);

//     const obj = getRecord(v);
//     if (!obj) return "";

//     const name = getString(obj.name);
//     if (name) return name;

//     const title = getString(obj.title);
//     if (title) return title;

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
//       const name = getString(obj.name);
//       if (name) return name;
//     }
//     return displayName(raw);
//   };

//   const getGradeLabel = (a: Announcement): string => {
//     const raw = (a as unknown as MaybeRecord).grade;

//     const direct = getString(raw);
//     if (direct) return direct;

//     const obj = getRecord(raw);
//     if (!obj) return displayName(raw);

//     const gradeName = getString(obj.name) ?? "";
//     const categoryName =
//       getString(obj.category_name) ??
//       (getRecord(obj.category) ? getString(getRecord(obj.category)?.name) : null) ??
//       "";

//     return categoryName ? `${gradeName} (${categoryName})` : gradeName;
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

//   // ---------------------------
//   // API actions
//   // ---------------------------
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

//       commentForm.resetFields();

//       // ✅ always scroll to latest after UI updates
//       safeScrollCommentsModalToBottom();
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const showModal = () => setIsModalOpen(true);

//   const handleCancel = () => {
//     announcementForm.resetFields();
//     setIsModalOpen(false);
//   };

//   const showSectionModal = async (caption: string, id: number) => {
//     setAnnouncementModalCaption(caption);
//     setAnnoucementId(id);
//     setIsSectionModalOpen(true);

//     try {
//       const res = await api.get<Comment[]>("comments/", {
//         params: { announcement: id },
//       });

//       setComments(res.data);

//       // ✅ scroll after comments are set + modal is open
//       safeScrollCommentsModalToBottom();
//     } catch (error) {
//       console.log(error);
//       setComments([]);
//     }
//   };

//   const handleSectionModalCancel = () => {
//     setIsSectionModalOpen(false);
//   };

//   const fetchAnnouncements = useCallback(async (subjectId?: number) => {
//     try {
//       const response = await api.get("announcements/list/", {
//         params: subjectId ? { subject: subjectId } : {},
//       });

//       const data = response.data as MaybeRecord;

//       const fetchedAnnouncements = (data.announcements as Announcement[]) ?? [];
//       const fetchedSubjects = (data.subjects as Subject[]) ?? [];
//       const categories = (data.categories as Categories[]) ?? [];
//       const grades = (data.grades as Grades[]) ?? [];
//       const role = (data.role as string) ?? null;

//       setCategories(categories);
//       setGrades(grades);
//       setUserRole(role);
//       setAnnouncements(fetchedAnnouncements);
//       setSubjects(fetchedSubjects);

//       setPage(1);
//       scrollToTop();
//     } catch (error) {
//       console.error("Error fetching announcements:", error);
//     }
//   }, []);

//   const createAnnouncement = async (data: CreateAnnouncementData) => {
//     try {
//       const res = await api.post<Announcement>("announcements/create/", data);
//       setAnnouncements((prev) => [...prev, res.data]);

//       setPage(1);
//       scrollToTop();
//     } catch (error) {
//       console.error("Error creating announcement:", error);
//     }
//   };

//   const handleOk = async () => {
//     try {
//       const values = await announcementForm.validateFields();
//       if (!values.subject) return;

//       const [sName, sgID, sgcID] = String(values.subject).split("-");

//       const payload: CreateAnnouncementData = {
//         title: values.title,
//         content: values.content,
//         subject_name: sName,
//         grade_id: +sgID,
//         category_id: +sgcID,
//       };

//       await createAnnouncement(payload);

//       announcementForm.resetFields();
//       setIsModalOpen(false);
//     } catch (error) {
//       console.log("Validation failed:", error);
//     }
//   };

//   // ---------------------------
//   // Effects
//   // ---------------------------
//   useEffect(() => {
//     fetchAnnouncements(selectedSubjectId);
//   }, [selectedSubjectId, fetchAnnouncements]);

//   // ✅ If modal opens later (animation), still force scroll
//   useEffect(() => {
//     if (isSectionModalOpen) {
//       safeScrollCommentsModalToBottom();
//     }
//   }, [isSectionModalOpen]);

//   // ---------------------------
//   // Memo (paging)
//   // ---------------------------
//   const sortedAnnouncements = useMemo(() => {
//     return announcements
//       .slice()
//       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
//     return subjects.find((s) => s.id === selectedSubjectId)?.name ?? t("chooseSubject");
//   }, [selectedSubjectId, subjects, t]);

//   // ---------------------------
//   // Render
//   // ---------------------------
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
//             <Button type="primary" onClick={showModal}>
//               {t("addAnnouncement")}
//             </Button>
//           )}

//           <Dropdown
//             popupRender={(menu) => <div style={{ maxHeight: 200, overflowY: "auto" }}>{menu}</div>}
//             menu={{
//               items: [
//                 {
//                   key: "all",
//                   label: t("allSubjects"),
//                   onClick: () => setSelectedSubjectId(undefined),
//                 },
//                 ...subjects.map((s) => ({
//                   key: String(s.id),
//                   label: `${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`,
//                   onClick: () => setSelectedSubjectId(s.id),
//                 })),
//               ],
//             }}
//             placement="bottomLeft"
//             trigger={["click"]}
//             arrow={{ pointAtCenter: true }}
//           >
//             <Button className={styles.filterButton}>
//               {selectedSubjectLabel}
//               <span className={styles.filterChevron}>▼</span>
//             </Button>
//           </Dropdown>
//         </div>
//       </div>

//       <Modal
//         title={t("createAnnouncementTitle")}
//         open={isModalOpen}
//         onOk={handleOk}
//         onCancel={handleCancel}
//         okText={t("submit")}
//       >
//         <Form form={announcementForm} layout="vertical">
//           <Form.Item
//             label={t("formTitleLabel")}
//             name="title"
//             rules={[{ required: true, message: t("validationEnterTitle") }]}
//           >
//             <Input placeholder={t("titlePlaceholder")} />
//           </Form.Item>

//           <Form.Item
//             label={t("formSubjectLabel")}
//             name="subject"
//             rules={[{ required: true, message: t("validationSelectSubject") }]}
//           >
//             <Select placeholder={t("subjectPlaceholder")}>
//               {subjects.map((s) => (
//                 <Select.Option
//                   key={s.id}
//                   value={`${s.name}-${s.grade.grade_id}-${s.grade.grade_category_id}`}
//                 >
//                   {`${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`}
//                 </Select.Option>
//               ))}
//             </Select>
//           </Form.Item>

//           <Form.Item
//             label={t("formContentLabel")}
//             name="content"
//             rules={[{ required: true, message: t("validationEnterContent") }]}
//           >
//             <TextArea rows={4} placeholder={t("contentPlaceholder")} />
//           </Form.Item>
//         </Form>
//       </Modal>

//       <div className={styles.announcementList}>
//         {sortedAnnouncements.length > 0 ? (
//           <>
//             {pagedAnnouncements.map((item) => (
//               <div
//                 key={item.id}
//                 className={styles.announcementCard}
//                 onClick={() => showSectionModal(item.title, item.id)}
//               >
//                 <div className={styles.announcementHeader}>
//                   <div className={styles.titleAndCommentsWrapper}>
//                     <h3 className={styles.announcementTitle}>{item.title}</h3>
//                   </div>

//                   <span className={styles.announcementDate}>
//                     <u>{new Date(item.created_at).toLocaleString()}</u>

//                     <div className={styles.commentsWrapper}>
//                       <CommentOutlined />
//                       <span className={styles.commentsCountStyle}>{item.len_comments}</span>
//                     </div>
//                   </span>
//                 </div>

//                 <div className={styles.announcementMeta}>
//                   <span className={styles.metaItem}>
//                     <strong>{t("author")}:</strong> {getCreatedByEmail(item)}
//                   </span>
//                   <span className={styles.metaItem}>
//                     <strong>{t("subject")}:</strong> {displayName(item.subject)}
//                   </span>
//                   <span className={styles.metaItem}>
//                     <strong>{t("grade")}:</strong> {getGradeLabel(item)}
//                   </span>
//                 </div>

//                 <p className={styles.announcementContent}>{item.content}</p>
//               </div>
//             ))}

//             {sortedAnnouncements.length > PAGE_SIZE ? (
//               <div className={styles.paginationWrapper}>
//                 <Pagination
//                   current={page}
//                   pageSize={PAGE_SIZE}
//                   total={sortedAnnouncements.length}
//                   onChange={(p) => {
//                     setPage(p);
//                     scrollToTop();
//                   }}
//                   showSizeChanger={false}
//                   showQuickJumper={false}
//                 />
//               </div>
//             ) : null}
//           </>
//         ) : (
//           <div className={styles.emptyAnnouncementWrapper}>
//             {t("empty")}
//             <FiInbox size={48} />
//           </div>
//         )}
//       </div>

//       <Modal
//         title={`${announcementModalCaption ?? ""}`}
//         open={isSectionModalOpen}
//         onCancel={handleSectionModalCancel}
//         footer={null}
//         afterOpenChange={(open) => {
//           if (open) safeScrollCommentsModalToBottom();
//         }}
//       >
//         <List
//           size="small"
//           bordered
//           dataSource={comments
//             .slice()
//             .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())}
//           className={styles.commentsList}
//           renderItem={(item: Comment) => (
//             <List.Item className={styles.commentItem}>
//               <div className={styles.outerWrapper}>
//                 <div className={styles.innerCommentItemSectionWrapper}>
//                   <div>
//                     <u className={styles.insideCommentsAuthorStyle}>
//                       {displayName((item as unknown as MaybeRecord).user)}
//                     </u>
//                   </div>
//                   <span className={styles.commentsDateTimeStyle}>
//                     {new Date(item.created_at).toLocaleString()}
//                   </span>
//                 </div>
//                 <span className={styles.commentStyle}>{getCommentText(item)}</span>
//               </div>
//             </List.Item>
//           )}
//           locale={{
//             emptyText: (
//               <span style={{ color: "rgb(77, 77, 77)", fontWeight: 700 }}>
//                 {t("noCommentsYet")}
//               </span>
//             ),
//           }}
//         />

//         <Form form={commentForm} layout="inline" onFinish={onCommentSend} style={{ width: "100%" }}>
//           <Form.Item
//             name="comment"
//             style={{ flex: 1 }}
//             rules={[{ required: true, message: t("validationTypeSomething") }]}
//           >
//             <Input placeholder={t("commentPlaceholder")} />
//           </Form.Item>

//           <Form.Item>
//             <Button type="primary" htmlType="submit">
//               {t("send")}
//             </Button>
//           </Form.Item>
//         </Form>
//       </Modal>
//     </div>
//   );
// }











"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./announcement.module.scss";
import api from "@/interceptors";
import { Button, Dropdown, Form, Input, List, Modal, Select, Pagination } from "antd";
import TextArea from "antd/es/input/TextArea";
import { Announcement, Subject, CreateAnnouncementData, Grades, Categories, Comment } from "./interface";
import { FiInbox } from "react-icons/fi";
import { CommentOutlined } from "@ant-design/icons";
import { FaBullhorn } from "react-icons/fa";
import { useTranslations } from "next-intl";

type MaybeRecord = Record<string, unknown>;

function isRecord(v: unknown): v is MaybeRecord {
  return typeof v === "object" && v !== null;
}
function getString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}
function getRecord(v: unknown): MaybeRecord | null {
  return isRecord(v) ? v : null;
}

export default function AnnouncementPage() {
  const t = useTranslations("Announcement");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [, setGrades] = useState<Grades[] | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [, setCategories] = useState<Categories[] | null>(null);
  const [announcementModalCaption, setAnnouncementModalCaption] = useState<string | null>(null);
  const [announcementId, setAnnoucementId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const [announcementForm] = Form.useForm();
  const [commentForm] = Form.useForm();

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // ✅ THIS IS THE FIX
  const scrollToTop = () => {
    const scroller = document.getElementById("app-scroll");
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const displayName = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);

    const obj = getRecord(v);
    if (!obj) return "";

    const name = getString(obj.name);
    if (name) return name;

    const title = getString(obj.title);
    if (title) return title;

    const email = getString(obj.email);
    if (email) return email;

    return "";
  };

  const getCreatedByEmail = (a: Announcement): string => {
    const raw = (a as unknown as MaybeRecord).created_by;

    const emailDirect = getString(raw);
    if (emailDirect) return emailDirect;

    const obj = getRecord(raw);
    if (obj) {
      const email = getString(obj.email);
      if (email) return email;
      const name = getString(obj.name);
      if (name) return name;
    }
    return displayName(raw);
  };

  const getGradeLabel = (a: Announcement): string => {
    const raw = (a as unknown as MaybeRecord).grade;

    const direct = getString(raw);
    if (direct) return direct;

    const obj = getRecord(raw);
    if (!obj) return displayName(raw);

    const gradeName = getString(obj.name) ?? "";
    const categoryName =
      getString(obj.category_name) ??
      (getRecord(obj.category) ? getString(getRecord(obj.category)?.name) : null) ??
      "";

    return categoryName ? `${gradeName} (${categoryName})` : gradeName;
  };

  const getCommentText = (c: Comment): string => {
    const obj = getRecord(c);
    if (!obj) return "";

    const comment = getString(obj.comment);
    if (comment) return comment;

    const content = getString(obj.content);
    if (content) return content;

    return "";
  };

  const onCommentSend = async (values: { comment: string }) => {
    if (!values.comment || !announcementId) return;

    try {
      const res = await api.post<Comment>("comments/create/", {
        comment: values.comment,
        announcement: announcementId,
      });

      setComments((prev) => [...prev, res.data]);

      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === announcementId ? { ...item, len_comments: item.len_comments + 1 } : item
        )
      );

      commentForm.resetFields();

      // optional: keep focus near latest comment list
      // scrollToTop();
    } catch (error) {
      console.log(error);
    }
  };

  const showModal = () => setIsModalOpen(true);

  const handleCancel = () => {
    announcementForm.resetFields();
    setIsModalOpen(false);
  };

  const showSectionModal = async (caption: string, id: number) => {
    setAnnouncementModalCaption(caption);
    setAnnoucementId(id);
    setIsSectionModalOpen(true);

    try {
      const res = await api.get<Comment[]>("comments/", {
        params: { announcement: id },
      });
      setComments(res.data);
    } catch (error) {
      console.log(error);
      setComments([]);
    }
  };

  const handleSectionModalCancel = () => {
    setIsSectionModalOpen(false);
  };

  const fetchAnnouncements = useCallback(async (subjectId?: number) => {
    try {
      const response = await api.get("announcements/list/", {
        params: subjectId ? { subject: subjectId } : {},
      });

      const data = response.data as MaybeRecord;

      const fetchedAnnouncements = (data.announcements as Announcement[]) ?? [];
      const fetchedSubjects = (data.subjects as Subject[]) ?? [];
      const categories = (data.categories as Categories[]) ?? [];
      const grades = (data.grades as Grades[]) ?? [];
      const role = (data.role as string) ?? null;

      setCategories(categories);
      setGrades(grades);
      setUserRole(role);
      setAnnouncements(fetchedAnnouncements);
      setSubjects(fetchedSubjects);

      setPage(1);
      scrollToTop();
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  }, []);

  const createAnnouncement = async (data: CreateAnnouncementData) => {
    try {
      const res = await api.post<Announcement>("announcements/create/", data);
      setAnnouncements((prev) => [...prev, res.data]);
      setPage(1);
      scrollToTop();
    } catch (error) {
      console.error("Error creating announcement:", error);
    }
  };

  const handleOk = async () => {
    try {
      const values = await announcementForm.validateFields();
      if (!values.subject) return;

      const [sName, sgID, sgcID] = String(values.subject).split("-");

      const payload: CreateAnnouncementData = {
        title: values.title,
        content: values.content,
        subject_name: sName,
        grade_id: +sgID,
        category_id: +sgcID,
      };

      await createAnnouncement(payload);

      announcementForm.resetFields();
      setIsModalOpen(false);
    } catch (error) {
      console.log("Validation failed:", error);
    }
  };

  useEffect(() => {
    fetchAnnouncements(selectedSubjectId);
  }, [selectedSubjectId, fetchAnnouncements]);

  const sortedAnnouncements = useMemo(() => {
    return announcements
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [announcements]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedAnnouncements.length / PAGE_SIZE));
    if (page > maxPage) setPage(1);
  }, [sortedAnnouncements.length, page]);

  const pagedAnnouncements = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedAnnouncements.slice(start, start + PAGE_SIZE);
  }, [sortedAnnouncements, page]);

  const selectedSubjectLabel = useMemo(() => {
    if (!selectedSubjectId) return t("allSubjects");
    return subjects.find((s) => s.id === selectedSubjectId)?.name ?? t("chooseSubject");
  }, [selectedSubjectId, subjects, t]);

  return (
    <div className={styles.dropDownWrapper}>
      <div className={styles.ButtonDropdownWrapper}>
        <div className={styles.WrapperOfMainCaptionAndIcon}>
          <span className={styles.headerIcon}>
            <FaBullhorn className={styles.navIcon} />
          </span>
          <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
        </div>

        <div className={styles.dropDownAndButtonWrapper}>
          {userRole === "teacher" && (
            <Button type="primary" onClick={showModal}>
              {t("addAnnouncement")}
            </Button>
          )}

          <Dropdown
            popupRender={(menu) => <div style={{ maxHeight: 200, overflowY: "auto" }}>{menu}</div>}
            menu={{
              items: [
                { key: "all", label: t("allSubjects"), onClick: () => setSelectedSubjectId(undefined) },
                ...subjects.map((s) => ({
                  key: String(s.id),
                  label: `${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`,
                  onClick: () => setSelectedSubjectId(s.id),
                })),
              ],
            }}
            placement="bottomLeft"
            trigger={["click"]}
            arrow={{ pointAtCenter: true }}
          >
            <Button className={styles.filterButton}>
              {selectedSubjectLabel}
              <span className={styles.filterChevron}>▼</span>
            </Button>
          </Dropdown>
        </div>
      </div>

      <Modal
        title={t("createAnnouncementTitle")}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={t("submit")}
      >
        <Form form={announcementForm} layout="vertical">
          <Form.Item
            label={t("formTitleLabel")}
            name="title"
            rules={[{ required: true, message: t("validationEnterTitle") }]}
          >
            <Input placeholder={t("titlePlaceholder")} />
          </Form.Item>

          <Form.Item
            label={t("formSubjectLabel")}
            name="subject"
            rules={[{ required: true, message: t("validationSelectSubject") }]}
          >
            <Select placeholder={t("subjectPlaceholder")}>
              {subjects.map((s) => (
                <Select.Option
                  key={s.id}
                  value={`${s.name}-${s.grade.grade_id}-${s.grade.grade_category_id}`}
                >
                  {`${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={t("formContentLabel")}
            name="content"
            rules={[{ required: true, message: t("validationEnterContent") }]}
          >
            <TextArea rows={4} placeholder={t("contentPlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>

      <div className={styles.announcementList}>
        {sortedAnnouncements.length > 0 ? (
          <>
            {pagedAnnouncements.map((item) => (
              <div
                key={item.id}
                className={styles.announcementCard}
                onClick={() => showSectionModal(item.title, item.id)}
              >
                <div className={styles.announcementHeader}>
                  <div className={styles.titleAndCommentsWrapper}>
                    <h3 className={styles.announcementTitle}>{item.title}</h3>
                  </div>

                  <span className={styles.announcementDate}>
                    <u>{new Date(item.created_at).toLocaleString()}</u>

                    <div className={styles.commentsWrapper}>
                      <CommentOutlined />
                      <span className={styles.commentsCountStyle}>{item.len_comments}</span>
                    </div>
                  </span>
                </div>

                <div className={styles.announcementMeta}>
                  <span className={styles.metaItem}>
                    <strong>{t("author")}:</strong> {getCreatedByEmail(item)}
                  </span>
                  <span className={styles.metaItem}>
                    <strong>{t("subject")}:</strong> {displayName(item.subject)}
                  </span>
                  <span className={styles.metaItem}>
                    <strong>{t("grade")}:</strong> {getGradeLabel(item)}
                  </span>
                </div>

                <p className={styles.announcementContent}>{item.content}</p>
              </div>
            ))}

            {sortedAnnouncements.length > PAGE_SIZE ? (
              <div className={styles.paginationWrapper}>
                <Pagination
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={sortedAnnouncements.length}
                  onChange={(p) => {
                    setPage(p);
                    // ✅ update page first
                    // then scroll
                    scrollToTop();
                    setPage(p);
                  }}
                  showSizeChanger={false}
                  showQuickJumper={false}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.emptyAnnouncementWrapper}>
            {t("empty")}
            <FiInbox size={48} />
          </div>
        )}
      </div>

      <Modal
        title={`${announcementModalCaption ?? ""}`}
        open={isSectionModalOpen}
        onCancel={handleSectionModalCancel}
        footer={null}
      >
        <List
          size="small"
          bordered
          dataSource={comments
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          className={styles.commentsList}
          renderItem={(item: Comment) => (
            <List.Item className={styles.commentItem}>
              <div className={styles.outerWrapper}>
                <div className={styles.innerCommentItemSectionWrapper}>
                  <div>
                    <u className={styles.insideCommentsAuthorStyle}>
                      {displayName((item as unknown as MaybeRecord).user)}
                    </u>
                  </div>
                  <span className={styles.commentsDateTimeStyle}>
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <span className={styles.commentStyle}>{getCommentText(item)}</span>
              </div>
            </List.Item>
          )}
          locale={{
            emptyText: (
              <span style={{ color: "rgb(77, 77, 77)", fontWeight: 700 }}>
                {t("noCommentsYet")}
              </span>
            ),
          }}
        />

        <Form form={commentForm} layout="inline" onFinish={onCommentSend} style={{ width: "100%" }}>
          <Form.Item
            name="comment"
            style={{ flex: 1 }}
            rules={[{ required: true, message: t("validationTypeSomething") }]}
          >
            <Input placeholder={t("commentPlaceholder")} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              {t("send")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}