import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchTodayLessons, markAttendance } from "@/api/endpoints";
import type { AttendanceLesson } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { SubjectMark } from "@/components/Subject";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { formatDay, parseISODate, isoWeekday, weekdayName } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

type Overrides = Record<string, boolean>;
const keyFor = (lessonId: number, studentId: number) => `${lessonId}:${studentId}`;

export function AttendanceView() {
  const { t } = useI18n();
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: fetchTodayLessons,
  });

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <AppText variant="heading">
            {weekdayName(isoWeekday(parseISODate(data.date)), t)}, {formatDay(data.date, t)}
          </AppText>
          {data.lessons.length === 0 ? (
            <EmptyState icon="attendance" title={t("attendance.empty")} message={t("attendance.emptyHint")} />
          ) : (
            data.lessons.map((lesson) => <LessonCard key={lesson.lesson_id} lesson={lesson} date={data.date} />)
          )}
        </>
      )}
    </Screen>
  );
}

function LessonCard({ lesson, date }: { lesson: AttendanceLesson; date: string }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  // Unsaved changes on top of what the server returned.
  const [overrides, setOverrides] = useState<Overrides>({});

  const isPresent = (studentId: number, fallback: boolean) =>
    overrides[keyFor(lesson.lesson_id, studentId)] ?? fallback;

  const setAll = (present: boolean) => {
    const next: Overrides = {};
    for (const student of lesson.students) next[keyFor(lesson.lesson_id, student.id)] = present;
    setOverrides(next);
  };

  const toggle = (studentId: number, current: boolean) => {
    Haptics.selectionAsync().catch(() => undefined);
    setOverrides((previous) => ({ ...previous, [keyFor(lesson.lesson_id, studentId)]: !current }));
  };

  const save = useMutation({
    mutationFn: () =>
      markAttendance(
        lesson.lesson_id,
        date,
        lesson.students.map((student) => ({
          student_id: student.id,
          is_present: isPresent(student.id, student.is_present),
        }))
      ),
    onSuccess: async () => {
      toast(t("attendance.saved"));
      await queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
      setOverrides({});
    },
    onError: (saveError) => toast(actionErrorMessage(saveError, t, t("attendance.saveFailed")), "error"),
  });

  const presentCount = lesson.students.filter((s) => isPresent(s.id, s.is_present)).length;
  const grade = `${lesson.grade_name} ${localize(lesson.grade_category_name, language)}`.trim();
  const subject = localize(lesson.subject_name, language);
  const dirty = Object.keys(overrides).length > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <SubjectMark subjectId={lesson.subject_id} label={subject} size={48} />
        <View style={styles.flex}>
          <AppText variant="subheading" numberOfLines={1}>
            {subject}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {lesson.time.start}–{lesson.time.end} · {t("common.grade")} {grade}
            {lesson.room ? ` · ${t("attendance.room", { room: lesson.room })}` : ""}
          </AppText>
        </View>
      </View>

      {lesson.students.length === 0 ? (
        <AppText tone="secondary">{t("attendance.noStudents")}</AppText>
      ) : (
        <>
          <View style={styles.bulk}>
            <Button title={t("attendance.allPresent")} variant="secondary" compact onPress={() => setAll(true)} style={styles.flex} />
            <Button title={t("attendance.allAbsent")} variant="danger" compact onPress={() => setAll(false)} style={styles.flex} />
          </View>

          <View style={styles.summary}>
            <AppText variant="caption" tone="secondary" style={styles.bold}>
              {t("attendance.summary", { present: presentCount, absent: lesson.students.length - presentCount })}
            </AppText>
            <ProgressBar progress={presentCount / lesson.students.length} color={colors.success} />
          </View>

          {lesson.students.map((student) => {
            const present = isPresent(student.id, student.is_present);
            return (
              <Pressable
                key={student.id}
                accessibilityRole="switch"
                accessibilityState={{ checked: present }}
                accessibilityLabel={student.name}
                onPress={() => toggle(student.id, present)}
                style={({ pressed }) => [styles.student, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                <Avatar name={student.name} size={34} />
                <AppText numberOfLines={1} style={styles.flex}>
                  {student.name}
                </AppText>
                <View
                  style={[styles.status, { backgroundColor: present ? colors.successMuted : colors.dangerMuted }]}
                >
                  <Icon name={present ? "check" : "cross"} size={16} color={present ? colors.success : colors.danger} />
                  <AppText variant="caption" style={{ color: present ? colors.success : colors.danger, fontWeight: "600" }}>
                    {present ? t("attendance.present") : t("attendance.absent")}
                  </AppText>
                </View>
              </Pressable>
            );
          })}

          <Button
            title={t("attendance.save")}
            icon="check"
            variant={dirty ? "gradient" : "secondary"}
            onPress={() => save.mutate()}
            loading={save.isPending}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
  card: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  summary: { gap: 6 },
  bulk: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.xs },
  student: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
