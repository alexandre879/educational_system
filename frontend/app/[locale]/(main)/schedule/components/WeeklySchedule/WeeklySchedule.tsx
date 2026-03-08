"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../schedule.module.scss";
import { Card, Tabs, Typography, Tag, Spin, Empty, message, List, Avatar } from "antd";
import { FiUsers } from "react-icons/fi";
import api from "@/interceptors";
import { WEEKDAYS } from "../../utils";
import { ApiResponse, Lesson, Student } from "../../interface";
import { BookOpen } from "lucide-react";
import { FaCalendarAlt } from "react-icons/fa";
import { AxiosError } from "axios";
import { useTranslations } from "next-intl";

const { Text } = Typography;

function sortByTime(a: Lesson, b: Lesson) {
  if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
  return a.end_time.localeCompare(b.end_time);
}

type ScheduleParams = {
  weekday: number;
  grade_id?: number;
};

export default function WeeklySchedule({ gradeId }: { gradeId?: number }) {
  const t = useTranslations("Schedule");

  const [loading, setLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  const [weekday, setWeekday] = useState<number>(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  });

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeLabel, setGradeLabel] = useState<string | null>(null);

  const fetchData = useCallback(
    async (w: number) => {
      try {
        setLoading(true);
        setIsForbidden(false);

        const params: ScheduleParams = { weekday: w };
        if (gradeId) params.grade_id = gradeId;

        const res = await api.get<ApiResponse>("schedule/grade-weekday", { params });

        setGradeLabel(res.data?.grade?.name ?? null);
        setLessons((res.data?.lessons ?? []).slice().sort(sortByTime));
        setStudents(res.data?.students ?? []);
      } catch (error: unknown) {
        const err = error as AxiosError<unknown>;

        if (err.response?.status === 403) {
          setIsForbidden(true);
          message.warning(t("onlyStudentsWarning"));
        } else {
          message.error(t("failedLoad"));
        }

        setLessons([]);
        setStudents([]);
        setGradeLabel(null);
      } finally {
        setLoading(false);
      }
    },
    [gradeId, t]
  );

  useEffect(() => {
    fetchData(weekday);
  }, [weekday, fetchData]);

  const weekdayKey = useMemo(() => {
    const map: Record<number, string> = {
      1: "mon",
      2: "tue",
      3: "wed",
      4: "thu",
      5: "fri",
      6: "sat",
      7: "sun",
    };
    return map[weekday] ?? "mon";
  }, [weekday]);

  const dayLabel = useMemo(() => t(`weekdays.${weekdayKey}`), [t, weekdayKey]);

  const tabItems = useMemo(
    () => WEEKDAYS.map((d) => {
        const dayMap: Record<number, string> = {
          1: "mon",
          2: "tue",
          3: "wed",
          4: "thu",
          5: "fri",
          6: "sat",
          7: "sun",
        };

        const key = dayMap[d.key] ?? "mon";
        const label = t(`weekdays.${key}`);

        return {
          key: String(d.key),
          label,
          children: loading ? (
            <div className={styles.loading}>
              <Spin size="large" />
            </div>
          ) : (
            <div className={styles.split}>
              <Card className={styles.dayCard} bordered={false}>
                <div className={styles.dayHeader}>
                  <Text className={styles.dayTitle}>
                    <BookOpen color="#1677ff" size={22} />
                    {label} {t("lessons")}
                  </Text>

                  <Text className={styles.dayCount}>
                    {lessons.length ? `${lessons.length} ${t("lessons")}` : ""}
                  </Text>
                </div>

                {!lessons.length ? (
                  <Empty description={<span className={styles.noLeassongsCaptionStyle}>{t("noLessons")}</span>} />
                ) : (
                  <div className={styles.dayList}>
                    {lessons.map((it) => (
                      <div className={styles.lesson} key={it.id}>
                        <div className={styles.timeBlock}>
                          <div className={styles.time}>
                            {it.start_time}–{it.end_time}
                          </div>
                          {it.room ? <Tag className={styles.roomTag}>{it.room}</Tag> : null}
                        </div>

                        <div className={styles.info}>
                          <div className={styles.subject}>{it.subject.name}</div>
                          <div className={styles.meta}>
                            <Text className={styles.teacher}>
                              {it.teacher?.name ?? t("teacherNotSet")}
                            </Text>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className={styles.studentsCard} bordered={false}>
                <div className={styles.dayHeader}>
                  <div className={styles.studentsTitle}>
                    <FiUsers />
                    <Text className={styles.dayTitle}>{t("students")}</Text>
                  </div>
                  <Text className={styles.dayCount}>{students.length ? `${students.length}` : ""}</Text>
                </div>

                {!students.length ? (
                  <Empty description={<span style={{ color: "grey" }}>{t("noStudents")}</span>} />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={students}
                    renderItem={(s: Student) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar src={s.profilePic ?? undefined}>{s.first_name?.[0]}</Avatar>}
                          title={<span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.first_name} {s.last_name}</span>}
                          description={<span className={styles.studentMailCaptionStyle}>{s.email}</span>}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </div>
          ),
        };
      }),
    [t, loading, lessons, students]
  );

  if (isForbidden) {
    return (
      <div className={styles.page}>
        <Empty
          description={
            <span style={{ color: "rgb(210, 99, 99)", fontWeight: 900, fontSize: 19 }}>
              {t("accessDenied")}
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.WrapperOfMainCaptionAndIcon}>
            <span className={styles.headerIcon}>
              <FaCalendarAlt className={styles.navIcon} />
            </span>
            <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
          </div>

          <div>
            <Text className={styles.subtitle}>
              {gradeLabel ? `${t("gradeLabel")}: ${gradeLabel} • ${dayLabel}` : `${t("weekdayLabel")}: ${dayLabel}`}
            </Text>
          </div>
        </div>
      </div>

      <Tabs
        activeKey={String(weekday)}
        onChange={(k) => setWeekday(Number(k))}
        items={tabItems}
      />
    </div>
  );
}