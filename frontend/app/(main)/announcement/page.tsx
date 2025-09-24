"use client";

import { useEffect, useState } from "react";
import styles from "./announcement.module.scss";
import api from "@/interceptors";
import { Button, Dropdown, Form, Input, Modal, Select, Typography } from "antd";
import TextArea from "antd/es/input/TextArea";
import { Announcement, Subject, CreateAnnouncementData, Grades, Categories } from "./interface";

const { Text } = Typography;

export default function AnnouncementPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
    const [grades, setGrades] = useState<Grades[] | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [categories, setCategories] = useState<Categories[] | null>(null);

    const [form] = Form.useForm();

    const showModal = () => setIsModalOpen(true);
    const handleCancel = () => {
        form.resetFields();
        setIsModalOpen(false);
    };

    const fetchAnnouncements = async (subjectId?: number) => {
        try {
            const response = await api.get("announcements/list/", {
                params: subjectId ? { subject: subjectId } : {},
            });
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
            await api.post("announcements/create/", data);
        } 
        catch (error) {
            console.error("Error creating announcement:", error);
        }
    };

    const handleOk = async () => {
        try {
            const values: CreateAnnouncementData = await form.validateFields();

            const payload = {
                title: values.title,
                content: values.content,
                grade_name: values.grade_name,
                category_id: values.category_id,
                subject_id: values.subject_id,
            };


            await createAnnouncement(payload);
            form.resetFields();
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
                                label: `${s.name} (${s.grade.grade_name})`,
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
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Title"
                        name="title"
                        rules={[{ required: true, message: "Please enter a title!" }]}
                    >
                        <Input placeholder="Enter announcement title" />
                    </Form.Item>


                    <Form.Item
                        label="Subject"
                        name="subject_id"
                        rules={[{ required: true, message: "Please select a subject!" }]}
                    >
                        <Select placeholder="Select a subject">
                            {subjects.map((s) => (
                                <Select.Option key={s.id} value={s.id}>
                                    {s.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Grade"
                        name="grade_name"
                        rules={[{ required: true, message: "Please select a grade!" }]}
                    >
                        <Select placeholder="Select a grade">
                            {grades?.slice(0, 12).map((g) => (
                                <Select.Option key={g.id} value={g.name}>
                                    {g.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>


                    <Form.Item
                        label="Category"
                        name="category_id"
                        rules={[{ required: true, message: "Please select a category!" }]}
                    >
                        <Select placeholder="Select a category">
                            {categories?.map((c) => (
                                <Select.Option key={c.id} value={c.id}>
                                    {c.name}
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
                {announcements.map((item) => (
                    <div key={item.id} className={styles.announcementCard}>
                        <div className={styles.announcementTitle}>{item.title}</div>
                        <div className={styles.announcementMeta}>
                            {" "}
                            <u>{item.user}</u> <span>{">"}</span> <u>{item.subject}</u>{" "} {`(${item.grade?.category.name})`}<br /> <br />
                            {new Date(item.created_at).toLocaleString()}
                        </div>
                        <div className={styles.announcementContent}>{item.content}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}