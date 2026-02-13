"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./schedule.module.scss";
import { Card, Tabs, Typography, Tag, Spin, Empty, message, List, Avatar } from "antd";
import { FiCalendar, FiUsers } from "react-icons/fi";
import api from "@/interceptors";
import { WEEKDAYS } from "./utils";
import { ApiResponse, Lesson, Student } from "./interface";

const { Title, Text } = Typography;



function sortByTime(a: Lesson, b: Lesson) {
  if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
  return a.end_time.localeCompare(b.end_time);
}

export default function WeeklySchedule({ gradeId }: { gradeId?: number }) {
  const [loading, setLoading] = useState(true);
  const [weekday, setWeekday] = useState<number>(1);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeLabel, setGradeLabel] = useState<string | null>(null);

  const fetchData = async (w: number) => {
    try {
      setLoading(true);

      const params: Record<string, any> = { weekday: w };
      if (gradeId) params.grade_id = gradeId;

      const res = await api.get<ApiResponse>("schedule/grade-weekday", { params });

      setGradeLabel(res.data?.grade?.name ?? null);
      setLessons((res.data?.lessons ?? []).slice().sort(sortByTime));
      setStudents(res.data?.students ?? []);
    }
    catch (e) {
      setLessons([]);
      setStudents([]);
      setGradeLabel(null);
      message.error("Failed to load schedule/users");
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(weekday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekday, gradeId]);

  const dayLabel = useMemo(() => WEEKDAYS.find((d) => d.key === weekday)?.label ?? "", [weekday]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <FiCalendar className={styles.icon} />
          <div>
            <Title level={3} className={styles.title}>Schedule</Title>
            <Text className={styles.subtitle}>
              {gradeLabel ? `Grade: ${gradeLabel} • ${dayLabel}` : `Weekday: ${dayLabel}`}
            </Text>
          </div>
        </div>
      </div>

      <Tabs
        activeKey={String(weekday)}
        onChange={(k) => setWeekday(Number(k))}
        items={WEEKDAYS.map((d) => ({
          key: String(d.key),
          label: d.label,
          children: (
            loading ? (
              <div className={styles.loading}><Spin size="large" /></div>
            ) : (
              <div className={styles.split}>
                {/* Lessons */}
                <Card className={styles.dayCard} bordered={false}>
                  <div className={styles.dayHeader}>
                    <Text className={styles.dayTitle}>{d.label} lessons</Text>
                    <Text className={styles.dayCount}>{lessons.length ? `${lessons.length} lessons` : ""}</Text>
                  </div>

                  {!lessons.length ? (
                    <Empty description="No lessons" />
                  ) : (
                    <div className={styles.dayList}>
                      {lessons.map((it) => (
                        <div className={styles.lesson} key={it.id}>
                          <div className={styles.timeBlock}>
                            <div className={styles.time}>{it.start_time}–{it.end_time}</div>
                            {it.room ? <Tag className={styles.roomTag}>{it.room}</Tag> : null}
                          </div>

                          <div className={styles.info}>
                            <div className={styles.subject}>{it.subject.name}</div>
                            <div className={styles.meta}>
                              <Text className={styles.teacher}>
                                {it.teacher?.name ?? "Teacher not set"}
                              </Text>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Students */}
                <Card className={styles.studentsCard} bordered={false}>
                  <div className={styles.dayHeader}>
                    <div className={styles.studentsTitle}>
                      <FiUsers />
                      <Text className={styles.dayTitle}>Students</Text>
                    </div>
                    <Text className={styles.dayCount}>{students.length ? `${students.length}` : ""}</Text>
                  </div>

                  {!students.length ? (
                    <Empty description="No students" />
                  ) : (
                    <List
                      itemLayout="horizontal"
                      dataSource={students}
                      renderItem={(s) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar src={s.profilePic ?? undefined}>{s.first_name?.[0]}</Avatar>}
                            title={`${s.first_name} ${s.last_name}`}
                            description={s.email}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </div>
            )
          ),
        }))}
      />
    </div>
  );
}