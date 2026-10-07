"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./exercise.module.scss";
import api from "@/interceptors";
import { FaBookOpen, FaCheckCircle, FaChevronLeft, FaChevronRight, FaClock, FaRegCircle, FaUser } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { message, Select } from "antd";
import { getLocalizedValue } from "@/lib/localized";
import { addDays, formatDay, isoWeekday, parseISODate, toISODate, weekdayName } from "@/lib/dates";
import { subjectColor } from "@/lib/subjects";
import { Exercise, ExerciseResponse, TeacherSubject } from "./interface";
import { Chips, Pill, ProgressBar } from "../components/ui/Parts";
import ui from "../components/ui/ui.module.scss";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Due-date choices when assigning homework, in days from today (0 = none), as in the mobile app.
const DUE_OPTIONS = [0, 1, 2, 7] as const;

export default function ExercisePage() {
  const t = useTranslations("Exercise");
  const tApp = useTranslations("App");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const locale = pathname?.split("/")[1] || "en";
  const openSubjectParam = searchParams.get("openSubject");
  const openSubjectId = openSubjectParam ? Number(openSubjectParam) : null;

  // Local calendar date (toISOString() would give the UTC date, which is
  // "yesterday" in Tbilisi between midnight and 04:00).
  const todayISO = toISODate(new Date());
  const dateParam = searchParams.get("date");
  const date = dateParam && ISO_DATE.test(dateParam) ? dateParam : todayISO;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Exercise[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueInDays, setDueInDays] = useState<(typeof DUE_OPTIONS)[number]>(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [createSubjectId, setCreateSubjectId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const replaceQuery = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const goToDate = (next: string) => replaceQuery({ date: next === todayISO ? null : next });

  const loadExercises = useCallback(async (day: string) => {
    try {
      setLoading(true);

      const res = await api.get<ExerciseResponse>("/exercises/daily/", {
        params: { date: day },
      });

      setItems(res.data?.items ?? []);
      setUserRole(res.data?.role ?? null);
      setTeacherSubjects(res.data?.subjects ?? []);
    } catch (error) {
      console.log(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercises(date);
  }, [loadExercises, date]);

  useEffect(() => {
    if (loading) return;

    if (openSubjectId && !Number.isNaN(openSubjectId)) {
      setSelectedSubjectId(openSubjectId);
    } else if (!openSubjectParam) {
      setSelectedSubjectId(null);
    }
  }, [loading, openSubjectId, openSubjectParam]);

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setDueInDays(0);
    setCreateSubjectId(null);
    setShowCreate(false);
  };

  const handleToggleCreate = () => {
    setShowCreate((prev) => !prev);
  };

  const handleCreateExercise = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    const subject = teacherSubjects.find((s) => s.id === createSubjectId);
    if (!trimmedTitle || !subject || saving) return;

    try {
      setSaving(true);
      await api.post("/exercises/daily/create/", {
        grade_id: subject.grade.id,
        subject_id: subject.id,
        date: todayISO,
        due_date: dueInDays ? toISODate(addDays(new Date(), dueInDays)) : null,
        title: trimmedTitle,
        description: trimmedDescription,
      });

      resetCreateForm();
      message.success(tApp("exercises.created"));
      // New exercises are set for today.
      if (date === todayISO) await loadExercises(todayISO);
      else goToDate(todayISO);
    } catch (error) {
      console.error(error);
      message.error(t("createFailed"));
    } finally {
      setSaving(false);
    }
  };

  /** A student ticks an exercise off (instantly, rolled back if the server refuses). */
  const toggleDone = async (exercise: Exercise) => {
    const done = !exercise.completed;
    const setCompleted = (value: boolean) =>
      setItems((current) => current.map((e) => (e.id === exercise.id ? { ...e, completed: value } : e)));

    setCompleted(done);
    try {
      const res = await api.post<{ completed: boolean; streak: number }>(`/exercises/${exercise.id}/complete/`, { done });
      if (res.data.completed && res.data.streak >= 2) {
        message.success(tApp("exercises.streak", { count: res.data.streak }));
      }
    } catch {
      setCompleted(!done);
      message.error(tApp("exercises.updateFailed"));
    }
  };

  const teacherSubjectOptions = useMemo(
    () =>
      teacherSubjects.map((s) => {
        const grade = getLocalizedValue(s.grade.name, locale);
        const category = getLocalizedValue(s.grade.category_name, locale);
        return {
          value: s.id,
          label: `${getLocalizedValue(s.name, locale)} (${grade}${category ? ` ${category}` : ""})`,
        };
      }),
    [teacherSubjects, locale]
  );

  const handleSubjectChange = (value: number | undefined) => {
    const nextValue = value ?? null;
    setSelectedSubjectId(nextValue);
    replaceQuery({ openSubject: nextValue ? String(nextValue) : null });
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

  const dueLabel = (days: (typeof DUE_OPTIONS)[number]) =>
    days === 0
      ? tApp("exercises.noDue")
      : days === 1
        ? tApp("exercises.tomorrow")
        : days === 7
          ? tApp("exercises.nextWeek")
          : tApp("exercises.inDays", { count: days });

  const dayDate = parseISODate(date);
  const dayTitle = `${date === todayISO ? tApp("common.today") : weekdayName(isoWeekday(dayDate), tApp)}, ${formatDay(dayDate, tApp)}`;
  // Due today or tomorrow → highlight.
  const dueSoonLimit = toISODate(addDays(new Date(), 1));

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
              onChange={handleSubjectChange}
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

      <div className={ui.monthHeader}>
        <button
          type="button"
          className={ui.iconBtn}
          aria-label={tApp("web.previousDay")}
          onClick={() => goToDate(toISODate(addDays(dayDate, -1)))}
        >
          <FaChevronLeft />
        </button>
        <span className={ui.monthTitle} style={{ cursor: "default" }}>
          {dayTitle}
        </span>
        {date !== todayISO ? (
          <button type="button" className={ui.chip} onClick={() => goToDate(todayISO)}>
            {tApp("common.today")}
          </button>
        ) : null}
        <button
          type="button"
          className={ui.iconBtn}
          aria-label={tApp("web.nextDay")}
          onClick={() => goToDate(toISODate(addDays(dayDate, 1)))}
        >
          <FaChevronRight />
        </button>
      </div>

      {showCreate && userRole === "teacher" && (
        <div className={styles.createCard}>
          <Select
            placeholder={t("subjectPlaceholder")}
            value={createSubjectId ?? undefined}
            onChange={(value: number) => setCreateSubjectId(value)}
            options={teacherSubjectOptions}
          />

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

          <div className={ui.field}>
            <span className={ui.label}>{tApp("web.dueDate")}</span>
            <Chips
              options={DUE_OPTIONS.map((days) => ({ value: days, label: dueLabel(days) }))}
              value={dueInDays}
              onChange={setDueInDays}
            />
          </div>

          <button
            className={styles.saveBtn}
            onClick={handleCreateExercise}
            disabled={saving || !title.trim() || !createSubjectId}
          >
            {t("save")}
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>{t("loadingExercises")}</div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.empty}>
          {selectedSubjectId ? t("noExercisesForSubject") : tApp("exercises.empty")}
        </div>
      ) : (
        <div className={styles.list}>
          {filteredItems.map((ex) => {
            const done = !!ex.completed;
            const dueSoon = !!ex.due_date && ex.due_date <= dueSoonLimit;

            return (
              <div
                key={ex.id}
                className={styles.card}
                style={{
                  borderLeft: `5px solid ${done ? "var(--ok)" : subjectColor(ex.subject?.id)}`,
                  opacity: done && userRole === "student" ? 0.85 : 1,
                }}
              >
                <div className={styles.cardHeader}>
                  <span
                    className={styles.cardTitle}
                    style={done && userRole === "student" ? { textDecoration: "line-through" } : undefined}
                  >
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
                  {userRole !== "student" && (
                    <span>
                      {t("gradeLabel")}: {getGradeLabel(ex)}
                    </span>
                  )}

                  {ex.teacher?.name && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <FaUser size={11} /> {ex.teacher.name}
                    </span>
                  )}

                  {ex.due_date && (
                    <Pill tone={dueSoon ? "warn" : "primary"}>
                      <FaClock size={11} /> {tApp("exercises.due", { date: formatDay(ex.due_date, tApp) })}
                    </Pill>
                  )}
                </div>

                {userRole === "student" ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    className={ui.btn}
                    onClick={() => toggleDone(ex)}
                    style={{
                      width: "100%",
                      marginTop: 12,
                      background: done ? "var(--ok-muted)" : undefined,
                      color: done ? "var(--ok)" : "var(--text-secondary)",
                    }}
                  >
                    {done ? <FaCheckCircle /> : <FaRegCircle />}
                    {done ? tApp("exercises.done") : tApp("exercises.markDone")}
                  </button>
                ) : userRole === "teacher" && ex.completion ? (
                  <div className={ui.row} style={{ marginTop: 12 }}>
                    <ProgressBar
                      value={ex.completion.total ? ex.completion.done / ex.completion.total : 0}
                      color="var(--ok)"
                    />
                    <span className={ui.muted} style={{ fontWeight: 700 }}>
                      {tApp("exercises.doneCount", { done: ex.completion.done, total: ex.completion.total })}
                    </span>
                  </div>
                ) : userRole === "parent" && ex.completed != null ? (
                  <div style={{ marginTop: 12 }}>
                    <Pill tone={done ? "ok" : "neutral"}>
                      {done ? <FaCheckCircle size={11} /> : <FaClock size={11} />}
                      {done ? tApp("exercises.done") : tApp("exercises.notDone")}
                    </Pill>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
