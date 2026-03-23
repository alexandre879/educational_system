// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import styles from "./announcement.module.scss";
// import api from "@/interceptors";
// import { Button, Dropdown, Form, Input, List, Select, Pagination, Modal } from "antd";
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
// import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   const locale = pathname?.split("/")[1] || "en";
//   const openAnnouncementParam = searchParams.get("openAnnouncement");
//   const openAnnouncementId = openAnnouncementParam ? Number(openAnnouncementParam) : null;

//   const leftPaneRef = useRef<HTMLDivElement | null>(null);
//   const rightPaneRef = useRef<HTMLDivElement | null>(null);

//   const [announcements, setAnnouncements] = useState<Announcement[]>([]);
//   const [subjects, setSubjects] = useState<Subject[]>([]);
//   const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
//   const [, setGrades] = useState<Grades[] | null>(null);
//   const [userRole, setUserRole] = useState<string | null>(null);
//   const [, setCategories] = useState<Categories[] | null>(null);

//   const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
//   const [announcementId, setAnnoucementId] = useState<number | null>(null);
//   const [comments, setComments] = useState<Comment[]>([]);

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [announcementForm] = Form.useForm();
//   const [commentForm] = Form.useForm();

//   const PAGE_SIZE = 10;
//   const [page, setPage] = useState(1);

//   const replaceAnnouncementQuery = useCallback(
//     (id?: number | null) => {
//       const params = new URLSearchParams(searchParams.toString());

//       if (id) {
//         params.set("openAnnouncement", String(id));
//       } else {
//         params.delete("openAnnouncement");
//       }

//       const query = params.toString();
//       router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
//     },
//     [pathname, router, searchParams]
//   );

//   const scrollListToTop = () => {
//     if (typeof window === "undefined") return;

//     if (window.innerWidth <= 980) {
//       window.scrollTo({ top: 0, behavior: "smooth" });
//       return;
//     }

//     leftPaneRef.current?.scrollTo({
//       top: 0,
//       behavior: "smooth",
//     });
//   };

//   const scrollThreadIntoViewOnMobile = () => {
//     if (typeof window === "undefined") return;
//     if (window.innerWidth <= 980) {
//       rightPaneRef.current?.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//     }
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

//   const clearSelectedAnnouncement = useCallback(() => {
//     setSelectedAnnouncement(null);
//     setAnnoucementId(null);
//     setComments([]);
//     replaceAnnouncementQuery(null);
//   }, [replaceAnnouncementQuery]);

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

//       setSelectedAnnouncement((prev) =>
//         prev && prev.id === announcementId
//           ? { ...prev, len_comments: prev.len_comments + 1 }
//           : prev
//       );

//       commentForm.resetFields();
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const selectAnnouncement = useCallback(
//     async (item: Announcement, syncUrl = true) => {
//       if (selectedAnnouncement?.id === item.id) {
//         if (syncUrl) replaceAnnouncementQuery(item.id);
//         return;
//       }

//       setSelectedAnnouncement(item);
//       setAnnoucementId(item.id);

//       if (syncUrl) replaceAnnouncementQuery(item.id);

//       await fetchComments(item.id);
//       scrollThreadIntoViewOnMobile();
//     },
//     [fetchComments, replaceAnnouncementQuery, selectedAnnouncement?.id]
//   );

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
//         scrollListToTop();

//         if (openAnnouncementId != null) {
//           const target = fetchedAnnouncements.find((x) => x.id === openAnnouncementId) ?? null;

//           if (target) {
//             setSelectedAnnouncement(target);
//             setAnnoucementId(target.id);
//             await fetchComments(target.id);
//             scrollThreadIntoViewOnMobile();
//             return;
//           }
//         }

//         if (announcementId != null) {
//           const stillExists = fetchedAnnouncements.find((x) => x.id === announcementId) ?? null;

//           if (stillExists) {
//             setSelectedAnnouncement(stillExists);
//             await fetchComments(stillExists.id);
//             return;
//           }
//         }

//         setSelectedAnnouncement(null);
//         setAnnoucementId(null);
//         setComments([]);
//       } catch (error) {
//         console.error("Error fetching announcements:", error);
//       }
//     },
//     [announcementId, fetchComments, openAnnouncementId]
//   );

//   const createAnnouncement = async (data: CreateAnnouncementData) => {
//     try {
//       const res = await api.post<Announcement>("announcements/create/", data);

//       setAnnouncements((prev) => [res.data, ...prev]);
//       setSelectedAnnouncement(res.data);
//       setAnnoucementId(res.data.id);
//       setComments([]);
//       setPage(1);
//       replaceAnnouncementQuery(res.data.id);
//       scrollListToTop();
//       scrollThreadIntoViewOnMobile();
//     } catch (error) {
//       console.error("Error creating announcement:", error);
//     }
//   };

//   const showModal = () => setIsModalOpen(true);

//   const handleCancel = () => {
//     announcementForm.resetFields();
//     setIsModalOpen(false);
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
//       setIsModalOpen(false);
//     } catch (error) {
//       console.log("Validation failed:", error);
//     }
//   };

//   useEffect(() => {
//     fetchAnnouncements(selectedSubjectId);
//   }, [selectedSubjectId, fetchAnnouncements]);

//   useEffect(() => {
//     if (openAnnouncementId == null) {
//       if (selectedAnnouncement) {
//         setSelectedAnnouncement(null);
//         setAnnoucementId(null);
//         setComments([]);
//       }
//       return;
//     }

//     const found = announcements.find((item) => item.id === openAnnouncementId);
//     if (found && selectedAnnouncement?.id !== found.id) {
//       void selectAnnouncement(found, false);
//     }
//   }, [openAnnouncementId, announcements, selectedAnnouncement, selectAnnouncement]);

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
//             <Button type="primary" onClick={showModal}>
//               {t("addAnnouncement")}
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

//       <Modal
//         title={t("createAnnouncementTitle")}
//         open={isModalOpen}
//         onOk={handleCreateSubmit}
//         onCancel={handleCancel}
//         okText={t("submit")}
//         cancelText={t("cancel")}
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
//                   value={`${s.id}-${s.grade.grade_id}-${s.grade.grade_category_id}`}
//                 >
//                   {`${getLocalizedValue(
//                     s.name as LocalizedValue,
//                     locale
//                   )} (${getLocalizedValue(
//                     s.grade.grade_name as LocalizedValue,
//                     locale
//                   )} ${getLocalizedValue(
//                     s.grade.grade_category_name as LocalizedValue,
//                     locale
//                   )})`}
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

//       <div className={styles.communicationLayout}>
//         <div ref={leftPaneRef} className={styles.leftPane}>
//           <div className={styles.announcementList}>
//             {sortedAnnouncements.length > 0 ? (
//               <>
//                 {pagedAnnouncements.map((item) => {
//                   const active = selectedAnnouncement?.id === item.id;

//                   return (
//                     <div
//                       key={item.id}
//                       className={`${styles.announcementCard} ${
//                         active ? styles.activeAnnouncementCard : ""
//                       }`}
//                       onClick={() => void selectAnnouncement(item)}
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
//                         scrollListToTop();
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

//         <div ref={rightPaneRef} className={styles.rightPane}>
//           {selectedAnnouncement ? (
//             <div className={styles.threadCard}>
//               <div className={styles.threadHeader}>
//                 <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
//                   <h2 className={styles.threadTitle}>
//                     {displayName(selectedAnnouncement.title)}
//                   </h2>

//                   <Button onClick={clearSelectedAnnouncement}>
//                     {t("cancel")}
//                   </Button>
//                 </div>

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
//                         <span className={styles.commentStyle}>
//                           {getCommentText(item)}
//                         </span>
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./announcement.module.scss";
import api from "@/interceptors";
import { Button, Dropdown, Form, Input, List, Select, Pagination, Modal } from "antd";
import TextArea from "antd/es/input/TextArea";
import {
  Announcement,
  Subject,
  CreateAnnouncementData,
  Grades,
  Categories,
  Comment,
} from "./interface";
import { FiInbox } from "react-icons/fi";
import { CommentOutlined } from "@ant-design/icons";
import { FaBullhorn } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type MaybeRecord = Record<string, unknown>;
type LocalizedValue = string | Record<string, string> | null | undefined;

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

function getLocalizedValue(value: LocalizedValue, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] || value.ka || value.en || value.ru || "";
}

type AnnouncementCardProps = {
  item: Announcement;
  active: boolean;
  authorLabel: string;
  subjectLabel: string;
  gradeLabel: string;
  contentLabel: string;
  titleLabel: string;
  dateLabel: string;
  authorText: string;
  subjectText: string;
  gradeText: string;
  onSelect: (item: Announcement) => void;
};

const AnnouncementCard = React.memo(function AnnouncementCard({
  item,
  active,
  authorLabel,
  subjectLabel,
  gradeLabel,
  contentLabel,
  titleLabel,
  dateLabel,
  authorText,
  subjectText,
  gradeText,
  onSelect,
}: AnnouncementCardProps) {
  const handleClick = useCallback(() => {
    onSelect(item);
  }, [onSelect, item]);

  return (
    <div
      className={`${styles.announcementCard} ${
        active ? styles.activeAnnouncementCard : ""
      }`}
      onClick={handleClick}
    >
      <div className={styles.announcementHeader}>
        <div className={styles.titleAndCommentsWrapper}>
          <h3 className={styles.announcementTitle}>{titleLabel}</h3>
        </div>

        <span className={styles.announcementDate}>
          <u>{dateLabel}</u>

          <div className={styles.commentsWrapper}>
            <CommentOutlined />
            <span className={styles.commentsCountStyle}>{item.len_comments}</span>
          </div>
        </span>
      </div>

      <div className={styles.announcementMeta}>
        <span className={styles.metaItem}>
          <strong>{authorText}:</strong> {authorLabel}
        </span>
        <span className={styles.metaItem}>
          <strong>{subjectText}:</strong> {subjectLabel}
        </span>
        <span className={styles.metaItem}>
          <strong>{gradeText}:</strong> {gradeLabel}
        </span>
      </div>

      <p className={styles.announcementContent}>{contentLabel}</p>
    </div>
  );
});

type CommentRowProps = {
  author: string;
  body: string;
  date: string;
};

const CommentRow = React.memo(function CommentRow({
  author,
  body,
  date,
}: CommentRowProps) {
  return (
    <List.Item className={styles.commentItem}>
      <div className={styles.outerWrapper}>
        <div className={styles.innerCommentItemSectionWrapper}>
          <div>
            <u className={styles.insideCommentsAuthorStyle}>{author}</u>
          </div>
          <span className={styles.commentsDateTimeStyle}>{date}</span>
        </div>
        <span className={styles.commentStyle}>{body}</span>
      </div>
    </List.Item>
  );
});

export default function AnnouncementPage() {
  const t = useTranslations("Announcement");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const locale = pathname?.split("/")[1] || "en";
  const openAnnouncementParam = searchParams.get("openAnnouncement");
  const openAnnouncementId = openAnnouncementParam ? Number(openAnnouncementParam) : null;

  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [, setGrades] = useState<Grades[] | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [, setCategories] = useState<Categories[] | null>(null);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const selectedAnnouncementId = selectedAnnouncement?.id ?? null;

  const [comments, setComments] = useState<Comment[]>([]);
  const commentsCacheRef = useRef<Record<number, Comment[]>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [announcementForm] = Form.useForm();
  const [commentForm] = Form.useForm();

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const scrollListToTop = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.innerWidth <= 980) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    leftPaneRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const scrollThreadIntoViewOnMobile = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.innerWidth <= 980) {
      rightPaneRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const replaceAnnouncementQuery = useCallback(
    (id?: number | null) => {
      const current = searchParams.get("openAnnouncement");
      const next = id ? String(id) : null;

      if (current === next) return;

      const params = new URLSearchParams(searchParams.toString());

      if (id) {
        params.set("openAnnouncement", String(id));
      } else {
        params.delete("openAnnouncement");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const displayName = useCallback(
    (v: unknown): string => {
      if (v == null) return "";
      if (typeof v === "string" || typeof v === "number") return String(v);

      const obj = getRecord(v);
      if (!obj) return "";

      const name = obj.name;
      if (name !== undefined) {
        const localizedName = getLocalizedValue(name as LocalizedValue, locale);
        if (localizedName) return localizedName;
      }

      const title = obj.title;
      if (title !== undefined) {
        const localizedTitle = getLocalizedValue(title as LocalizedValue, locale);
        if (localizedTitle) return localizedTitle;
      }

      const email = getString(obj.email);
      if (email) return email;

      return "";
    },
    [locale]
  );

  const getCreatedByEmail = useCallback(
    (a: Announcement): string => {
      const raw = (a as unknown as MaybeRecord).created_by;

      const emailDirect = getString(raw);
      if (emailDirect) return emailDirect;

      const obj = getRecord(raw);
      if (obj) {
        const email = getString(obj.email);
        if (email) return email;

        const name = obj.name;
        if (name !== undefined) {
          const localizedName = getLocalizedValue(name as LocalizedValue, locale);
          if (localizedName) return localizedName;
        }
      }

      return displayName(raw);
    },
    [displayName, locale]
  );

  const getGradeLabel = useCallback(
    (a: Announcement): string => {
      const raw = (a as unknown as MaybeRecord).grade;

      const direct = getString(raw);
      if (direct) return direct;

      const obj = getRecord(raw);
      if (!obj) return displayName(raw);

      const gradeName = getLocalizedValue(obj.name as LocalizedValue, locale) ?? "";

      const categoryName =
        getLocalizedValue(obj.category_name as LocalizedValue, locale) ||
        (getRecord(obj.category)
          ? getLocalizedValue(getRecord(obj.category)?.name as LocalizedValue, locale)
          : "") ||
        "";

      return categoryName ? `${gradeName} ${categoryName}` : gradeName;
    },
    [displayName, locale]
  );

  const getCommentText = useCallback((c: Comment): string => {
    const obj = getRecord(c);
    if (!obj) return "";

    const comment = getString(obj.comment);
    if (comment) return comment;

    const content = getString(obj.content);
    if (content) return content;

    return "";
  }, []);

  const fetchComments = useCallback(async (id: number, force = false) => {
    if (!force && commentsCacheRef.current[id]) {
      setComments(commentsCacheRef.current[id]);
      return;
    }

    try {
      const res = await api.get<Comment[]>("comments/", {
        params: { announcement: id },
      });

      commentsCacheRef.current[id] = res.data;
      setComments(res.data);
    } catch (error) {
      console.log(error);
      setComments([]);
    }
  }, []);

  const clearSelectedAnnouncement = useCallback(() => {
    setSelectedAnnouncement(null);
    setComments([]);
    replaceAnnouncementQuery(null);
  }, [replaceAnnouncementQuery]);

  const onCommentSend = async (values: { comment: string }) => {
    if (!values.comment || !selectedAnnouncementId) return;

    try {
      const res = await api.post<Comment>("comments/create/", {
        comment: values.comment,
        announcement: selectedAnnouncementId,
      });

      setComments((prev) => {
        const next = [...prev, res.data];
        commentsCacheRef.current[selectedAnnouncementId] = next;
        return next;
      });

      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === selectedAnnouncementId
            ? { ...item, len_comments: item.len_comments + 1 }
            : item
        )
      );

      setSelectedAnnouncement((prev) =>
        prev && prev.id === selectedAnnouncementId
          ? { ...prev, len_comments: prev.len_comments + 1 }
          : prev
      );

      commentForm.resetFields();
    } catch (error) {
      console.log(error);
    }
  };

  const selectAnnouncement = useCallback(
    async (item: Announcement, syncUrl = true) => {
      if (syncUrl) {
        replaceAnnouncementQuery(item.id);
      }

      if (selectedAnnouncementId === item.id) {
        scrollThreadIntoViewOnMobile();
        return;
      }

      setSelectedAnnouncement(item);
      await fetchComments(item.id);
      scrollThreadIntoViewOnMobile();
    },
    [
      fetchComments,
      replaceAnnouncementQuery,
      scrollThreadIntoViewOnMobile,
      selectedAnnouncementId,
    ]
  );

  const handleSelectAnnouncement = useCallback(
    (item: Announcement) => {
      void selectAnnouncement(item, true);
    },
    [selectAnnouncement]
  );

  const fetchAnnouncements = useCallback(
    async (subjectId?: number) => {
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
        scrollListToTop();
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    },
    [scrollListToTop]
  );

  const createAnnouncement = async (data: CreateAnnouncementData) => {
    try {
      const res = await api.post<Announcement>("announcements/create/", data);

      setAnnouncements((prev) => [res.data, ...prev]);
      setSelectedAnnouncement(res.data);
      setComments([]);
      commentsCacheRef.current[res.data.id] = [];
      setPage(1);
      replaceAnnouncementQuery(res.data.id);
      scrollListToTop();
      scrollThreadIntoViewOnMobile();
    } catch (error) {
      console.error("Error creating announcement:", error);
    }
  };

  const showModal = () => setIsModalOpen(true);

  const handleCancel = () => {
    announcementForm.resetFields();
    setIsModalOpen(false);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await announcementForm.validateFields();
      if (!values.subject) return;

      const [subjectID, sgID, sgcID] = String(values.subject).split("-");

      const payload: CreateAnnouncementData = {
        title: values.title,
        content: values.content,
        subject_id: +subjectID,
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
    void fetchAnnouncements(selectedSubjectId);
  }, [selectedSubjectId, fetchAnnouncements]);

  useEffect(() => {
    if (openAnnouncementId == null) {
      setSelectedAnnouncement(null);
      setComments([]);
      return;
    }

    const found = announcements.find((item) => item.id === openAnnouncementId);
    if (!found) return;

    if (selectedAnnouncementId === found.id) return;

    void selectAnnouncement(found, false);
  }, [openAnnouncementId, announcements, selectedAnnouncementId, selectAnnouncement]);

  useEffect(() => {
    if (!selectedAnnouncementId) return;

    setSelectedAnnouncement((prev) => {
      if (!prev) return prev;
      const updated = announcements.find((item) => item.id === prev.id);
      return updated ?? null;
    });
  }, [announcements, selectedAnnouncementId]);

  const sortedAnnouncements = useMemo(() => {
    return announcements
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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

    const subject = subjects.find((s) => s.id === selectedSubjectId);
    if (!subject) return t("chooseSubject");

    return `${getLocalizedValue(
      subject.name as LocalizedValue,
      locale
    )} (${getLocalizedValue(
      subject.grade.grade_name as LocalizedValue,
      locale
    )} ${getLocalizedValue(
      subject.grade.grade_category_name as LocalizedValue,
      locale
    )})`;
  }, [selectedSubjectId, subjects, t, locale]);

  const sortedComments = useMemo(() => {
    return comments
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [comments]);

  const subjectMenuItems = useMemo(
    () => [
      {
        key: "all",
        label: t("allSubjects"),
        onClick: () => setSelectedSubjectId(undefined),
      },
      ...subjects.map((s) => ({
        key: String(s.id),
        label: `${getLocalizedValue(
          s.name as LocalizedValue,
          locale
        )} (${getLocalizedValue(
          s.grade.grade_name as LocalizedValue,
          locale
        )} ${getLocalizedValue(
          s.grade.grade_category_name as LocalizedValue,
          locale
        )})`,
        onClick: () => setSelectedSubjectId(s.id),
      })),
    ],
    [subjects, locale, t]
  );

  const announcementViewModels = useMemo(() => {
    return pagedAnnouncements.map((item) => ({
      item,
      active: selectedAnnouncementId === item.id,
      titleLabel: displayName(item.title),
      authorLabel: getCreatedByEmail(item),
      subjectLabel: displayName(item.subject),
      gradeLabel: getGradeLabel(item),
      contentLabel: displayName(item.content),
      dateLabel: new Date(item.created_at).toLocaleString(),
    }));
  }, [
    pagedAnnouncements,
    selectedAnnouncementId,
    displayName,
    getCreatedByEmail,
    getGradeLabel,
  ]);

  const commentViewModels = useMemo(() => {
    return sortedComments.map((item) => ({
      item,
      author: displayName((item as unknown as MaybeRecord).user),
      body: getCommentText(item),
      date: new Date(item.created_at).toLocaleString(),
    }));
  }, [sortedComments, displayName, getCommentText]);

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
            overlayClassName={styles.glassDropdown}
            popupRender={(menu) => (
              <div className={styles.dropdownPopupShell}>
                <div className={styles.dropdownScrollWrapper}>{menu}</div>
              </div>
            )}
            menu={{ items: subjectMenuItems }}
            placement="bottomCenter"
            trigger={["click"]}
            arrow={{ pointAtCenter: true }}
            getPopupContainer={(triggerNode) =>
              triggerNode.parentElement || document.body
            }
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
        onOk={handleCreateSubmit}
        onCancel={handleCancel}
        okText={t("submit")}
        cancelText={t("cancel")}
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
                  value={`${s.id}-${s.grade.grade_id}-${s.grade.grade_category_id}`}
                >
                  {`${getLocalizedValue(
                    s.name as LocalizedValue,
                    locale
                  )} (${getLocalizedValue(
                    s.grade.grade_name as LocalizedValue,
                    locale
                  )} ${getLocalizedValue(
                    s.grade.grade_category_name as LocalizedValue,
                    locale
                  )})`}
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

      <div className={styles.communicationLayout}>
        <div ref={leftPaneRef} className={styles.leftPane}>
          <div className={styles.announcementList}>
            {sortedAnnouncements.length > 0 ? (
              <>
                {announcementViewModels.map((vm) => (
                  <AnnouncementCard
                    key={vm.item.id}
                    item={vm.item}
                    active={vm.active}
                    authorLabel={vm.authorLabel}
                    subjectLabel={vm.subjectLabel}
                    gradeLabel={vm.gradeLabel}
                    contentLabel={vm.contentLabel}
                    titleLabel={vm.titleLabel}
                    dateLabel={vm.dateLabel}
                    authorText={t("author")}
                    subjectText={t("subject")}
                    gradeText={t("grade")}
                    onSelect={handleSelectAnnouncement}
                  />
                ))}

                {sortedAnnouncements.length > PAGE_SIZE ? (
                  <div className={styles.paginationWrapper}>
                    <Pagination
                      current={page}
                      pageSize={PAGE_SIZE}
                      total={sortedAnnouncements.length}
                      onChange={(p) => {
                        setPage(p);
                        scrollListToTop();
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
        </div>

        <div ref={rightPaneRef} className={styles.rightPane}>
          {selectedAnnouncement ? (
            <div className={styles.threadCard}>
              <div className={styles.threadHeader}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <h2 className={styles.threadTitle}>
                    {displayName(selectedAnnouncement.title)}
                  </h2>

                  <Button onClick={clearSelectedAnnouncement}>{t("cancel")}</Button>
                </div>

                <div className={styles.threadMeta}>
                  <span className={styles.metaItem}>
                    <strong>{t("author")}:</strong> {getCreatedByEmail(selectedAnnouncement)}
                  </span>
                  <span className={styles.metaItem}>
                    <strong>{t("subject")}:</strong> {displayName(selectedAnnouncement.subject)}
                  </span>
                  <span className={styles.metaItem}>
                    <strong>{t("grade")}:</strong> {getGradeLabel(selectedAnnouncement)}
                  </span>
                </div>
              </div>

              <div className={styles.threadContent}>
                {displayName(selectedAnnouncement.content)}
              </div>

              <div className={styles.threadCommentsBlock}>
                <List
                  size="small"
                  bordered
                  dataSource={commentViewModels}
                  className={styles.commentsList}
                  renderItem={(vm) => (
                    <CommentRow
                      key={vm.item.id}
                      author={vm.author}
                      body={vm.body}
                      date={vm.date}
                    />
                  )}
                  locale={{
                    emptyText: (
                      <span style={{ color: "rgb(77, 77, 77)", fontWeight: 700 }}>
                        {t("noCommentsYet")}
                      </span>
                    ),
                  }}
                />
              </div>

              <div className={styles.replyComposer}>
                <Form
                  form={commentForm}
                  layout="inline"
                  onFinish={onCommentSend}
                  style={{ width: "100%" }}
                >
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
              </div>
            </div>
          ) : (
            <div className={styles.threadEmpty}>
              <FiInbox size={42} />
              <span>{t("empty")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}