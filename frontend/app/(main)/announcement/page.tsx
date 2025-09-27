"use client";

import { useEffect, useState } from "react";
import styles from "./announcement.module.scss";
import api from "@/interceptors";
import { Button, Dropdown, Form, Input, List, Modal, Select } from "antd";
import TextArea from "antd/es/input/TextArea";
import { Announcement, Subject, CreateAnnouncementData, Grades, Categories, Comment } from "./interface";
import { FiInbox } from "react-icons/fi";
import { MdComment } from "react-icons/md";


export default function AnnouncementPage() {

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
    const [grades, setGrades] = useState<Grades[] | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [categories, setCategories] = useState<Categories[] | null>(null);
    const [announcementModalCaption, setAnnouncementModalCaption] = useState<string | null>(null)
    const [announcementId, setAnnoucementId] = useState<number | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);

    const [announcementForm] = Form.useForm();
    const [commentForm] = Form.useForm();


    const onCommentSend = async (values: { comment: string }) => {
        if (!values.comment) return;

        try {
            const res = await api.post<Comment>('comments/create/', { comment: values.comment, announcement: announcementId })
            setComments(prev => [...prev, res.data])
            setAnnouncements(prev => (
                prev.map(item => item.id === announcementId ? { ...item, len_comments: item.len_comments + 1 } : item)
            ))
            commentForm.resetFields()
        }
        catch (error) {
            console.log(error)
        }
    }


    const showModal = () => setIsModalOpen(true);

    const handleCancel = () => {
        announcementForm.resetFields();
        setIsModalOpen(false);
    };


    const showSectionModal = async (caption: string, id: number) => {
        try {
            const res = await api.get<Comment[]>('comments/', {
                params: { announcement: id }
            });
            setComments(res.data);
        }
        catch (error) {
            console.log(error);
        }

        setAnnouncementModalCaption(caption);
        setAnnoucementId(id);
        setIsSectionModalOpen(true);
    };



    const handleSectionModalCancel = () => {
        setIsSectionModalOpen(false);
    };

    const fetchAnnouncements = async (subjectId?: number) => {
        try {
            const response = await api.get("announcements/list/", {
                params: subjectId ? { subject: subjectId } : {},
            });

            {

            }
            const { announcements: fetchedAnnouncements, subjects: fetchedSubjects, categories, grades, role } = response.data;

            setCategories(categories)
            setGrades(grades);
            setUserRole(role);
            setAnnouncements(fetchedAnnouncements);
            setSubjects(fetchedSubjects);
        }
        catch (error) {
            console.error("Error fetching announcements:", error);
        }
    };


    const createAnnouncement = async (data: CreateAnnouncementData) => {

        try {
            const res = await api.post<Announcement>("announcements/create/", data);
            setAnnouncements(prev => [...prev, res.data])
        }
        catch (error) {
            console.error("Error creating announcement:", error);
        }
    };

    const handleOk = async () => {
        try {
            const values = await announcementForm.validateFields();
            if (!values.subject) return;

            const [sName, sgID, sgcID] = values.subject.split("-")

            const payload: CreateAnnouncementData = {
                title: values.title,
                content: values.content,
                subject_name: sName,
                grade_id: sgID,
                category_id: sgcID,
            };

            await createAnnouncement(payload);

            announcementForm.resetFields();
            setIsModalOpen(false);
        } 
        catch (error) {
            console.log("Validation failed:", error);
        }
    };

    useEffect(() => {
        fetchAnnouncements(selectedSubjectId);
    }, [selectedSubjectId]);



    return (
        <div className={styles.dropDownWrapper}>
            <div className={styles.ButtonDropdownWrapper}>
                {userRole === "teacher" && (
                    <Button type="primary" onClick={showModal}>
                        Add Announcement
                    </Button>
                )}
                <Dropdown
                    popupRender={(menu) => (
                        <div style={{ maxHeight: 200, overflowY: "auto" }}>
                            {menu}
                        </div>
                    )}
                    menu={{
                        items: [
                            ...subjects.map((s) => ({
                                key: s.id,
                                label: `${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`,
                                onClick: () => setSelectedSubjectId(s.id),
                            })),
                        ],
                    }}
                    placement="bottomLeft"
                    trigger={["click"]}
                    arrow={{ pointAtCenter: true }}
                >
                    <Button>
                        {selectedSubjectId
                            ? subjects.find((s) => s.id === selectedSubjectId)?.name
                            : "Subjects"}{" "}
                        <span>▼</span>
                    </Button>
                </Dropdown>
            </div>


            <Modal
                title="Create Announcement"
                open={isModalOpen}
                onOk={handleOk}
                onCancel={handleCancel}
                okText="Submit"
            >
                <Form form={announcementForm} layout="vertical">
                    <Form.Item
                        label="Title"
                        name="title"
                        rules={[{ required: true, message: "Please enter a title!" }]}
                    >
                        <Input placeholder="Enter announcement title" />
                    </Form.Item>


                    <Form.Item
                        label="Subject"
                        name="subject"
                        rules={[{ required: true, message: "Please select a subject!" }]}
                    >
                        <Select placeholder="Select a subject">
                            {subjects.map((s) => (
                                <Select.Option key={s.id} value={`${s.name}-${s.grade.grade_id}-${s.grade.grade_category_id}`}>
                                    {`${s.name} (${s.grade.grade_name}-${s.grade.grade_category_name})`}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>


                    <Form.Item
                        label="Content"
                        name="content"
                        rules={[{ required: true, message: "Please enter a description!" }]}
                    >
                        <TextArea rows={4} placeholder="Write your announcement..." />
                    </Form.Item>
                </Form>
            </Modal>




            <div className={styles.announcementList}>
                {announcements.length > 0 ? (
                    <>
                        {announcements
                            .slice()
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className={styles.announcementCard}
                                    onClick={() => showSectionModal(item.title, item.id)}
                                >
                                    <div className={styles.announcementHeader}>
                                        <div className={styles.titleAndCommentsWrapper}>
                                            <h3 className={styles.announcementTitle}>{item.title}</h3>
                                            <div className={styles.commentsWrapper}>
                                                <MdComment size={22} />
                                                <span className={styles.commentsCountStyle}>
                                                    {item.len_comments}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={styles.announcementDate}>
                                            {new Date(item.created_at).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className={styles.announcementMeta}>
                                        <span className={styles.metaItem}>
                                            <strong>Author:</strong> {item.user}
                                        </span>
                                        <span className={styles.metaItem}>
                                            <strong>Subject:</strong> {item.subject}
                                        </span>
                                        <span className={styles.metaItem}>
                                            <strong>Grade:</strong> {item.grade.name} ({item.grade?.category.name})
                                        </span>
                                    </div>

                                    <p className={styles.announcementContent}>{item.content}</p>
                                </div>
                            ))}
                    </>
                ) : (
                    <div className={styles.emptyAnnouncementWrapper}>
                        Empty
                        <FiInbox size={48} />
                    </div>
                )}
            </div>
            <Modal
                title={`${announcementModalCaption} - Comments`}
                open={isSectionModalOpen}
                onCancel={handleSectionModalCancel}
                footer={null}
            >
                <List
                    size="small"
                    bordered
                    dataSource={comments.slice().sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )}
                    className={styles.commentsList}
                    renderItem={(item: Comment) => (
                        <List.Item className={styles.commentItem}>
                            <div className={styles.outerWrapper} >
                                <div className={styles.innerCommentItemSectionWrapper} >
                                    <div>
                                        <u className={styles.insideCommentsAuthorStyle}>{item.user}</u>
                                    </div>
                                    <span className={styles.commentsDateTimeStyle} >{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                                <span>{item.comment}</span>
                            </div>
                        </List.Item>
                    )}
                    locale={{ emptyText: "No comments yet" }}
                />
                <Form
                    form={commentForm}
                    layout="inline"
                    onFinish={onCommentSend}
                    style={{ width: "100%" }}
                >
                    <Form.Item
                        name="comment"
                        style={{ flex: 1 }}
                        rules={[{ required: true, message: "Please type something!" }]}
                    >
                        <Input placeholder="Type your comment..." />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Send
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>

    );
}