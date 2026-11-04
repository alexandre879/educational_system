import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchDailyExercises, setExerciseDone } from "@/api/endpoints";
import type { DailyExercises, Exercise, Role } from "@/api/types";
import { useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/Controls";
import { DateStrip } from "@/components/DateStrip";
import { Icon } from "@/components/Icon";
import { Screen, TitleAction } from "@/components/Screen";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { SubjectBadge } from "@/components/Subject";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { addDays, formatDay, parseISODate, toISODate } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, subjectColor, useTheme } from "@/theme";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function ExercisesScreen() {
  const { t } = useI18n();
  const user = useCurrentUser();
  const params = useLocalSearchParams<{ date?: string }>();

  const today = toISODate(new Date());
  const [date, setDate] = useState(() => (params.date && ISO_DATE.test(params.date) ? params.date : today));

  // A tapped notification can point at a specific day while this screen is already open.
  const [lastParamDate, setLastParamDate] = useState(params.date);
  if (params.date !== lastParamDate) {
    setLastParamDate(params.date);
    if (params.date && ISO_DATE.test(params.date)) setDate(params.date);
  }

  const queryKey = ["exercises", date];
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchDailyExercises(date),
  });

  const queryClient = useQueryClient();
  const toast = useToast();
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => setExerciseDone(id, done),
    // Tick it off instantly; roll back if the server refuses.
    onMutate: ({ id, done }) => {
      const previous = queryClient.getQueryData<DailyExercises>(queryKey);
      queryClient.setQueryData<DailyExercises>(queryKey, (current) =>
        current && { ...current, items: current.items.map((e) => (e.id === id ? { ...e, completed: done } : e)) }
      );
      if (done) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return { previous };
    },
    onError: (toggleError, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast(actionErrorMessage(toggleError, t, t("exercises.updateFailed")), "error");
    },
    onSuccess: (result) => {
      if (result.completed && result.streak >= 2) toast(t("exercises.streak", { count: result.streak }));
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  return (
    <Screen
      title={t("exercises.title")}
      actions={
        user.role === "teacher" ? (
          <TitleAction icon="add" label={t("exercises.add")} onPress={() => router.push("/exercises/new")} />
        ) : undefined
      }
      onRefresh={refetch}
      refreshing={isRefetching}
    >
      <DateStrip value={date} onChange={setDate} />

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState icon="exercises" title={t("exercises.empty")} />
      ) : (
        data.items.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            role={user.role}
            onToggle={() => toggle.mutate({ id: exercise.id, done: !exercise.completed })}
          />
        ))
      )}
    </Screen>
  );
}

function ExerciseCard({ exercise, role, onToggle }: { exercise: Exercise; role: Role | null; onToggle: () => void }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const accent = subjectColor(exercise.subject?.id);
  const showGrade = role !== "student";
  const done = !!exercise.completed;

  // Due today or tomorrow → highlight.
  const dueSoon =
    !!exercise.due_date && exercise.due_date <= toISODate(addDays(new Date(), 1));

  return (
    <Card style={[styles.card, done && role === "student" && styles.doneCard]}>
      <View style={[styles.stripe, { backgroundColor: done ? colors.success : accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.badges}>
          {exercise.subject ? (
            <SubjectBadge subjectId={exercise.subject.id} label={localize(exercise.subject.name, language)} />
          ) : null}
          {showGrade ? (
            <View style={[styles.pill, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="caption" tone="secondary" style={styles.pillText}>
                {`${t("common.grade")} ${exercise.grade.name} ${localize(exercise.grade.category_name, language)}`.trim()}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="subheading" style={done && role === "student" ? styles.doneTitle : undefined}>
          {exercise.title}
        </AppText>
        {exercise.description ? <AppText tone="secondary">{exercise.description}</AppText> : null}
        <View style={styles.footer}>
          {exercise.teacher.name ? (
            <View style={styles.teacher}>
              <Icon name="person" size={14} color={colors.textMuted} />
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {exercise.teacher.name}
              </AppText>
            </View>
          ) : (
            <View style={styles.flex} />
          )}
          {exercise.due_date ? (
            <View style={[styles.pill, { backgroundColor: dueSoon ? colors.warningMuted : colors.primaryMuted }]}>
              <Icon name="clock" size={13} color={dueSoon ? colors.warning : colors.primary} />
              <AppText variant="caption" style={[styles.pillText, { color: dueSoon ? colors.warning : colors.primary }]}>
                {t("exercises.due", { date: formatDay(parseISODate(exercise.due_date), t) })}
              </AppText>
            </View>
          ) : null}
        </View>

        {role === "student" ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            onPress={onToggle}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: done ? colors.successMuted : colors.surfaceMuted },
              pressed && styles.pressed,
            ]}
          >
            <Icon name={done ? "check" : "circle"} size={18} color={done ? colors.success : colors.textSecondary} />
            <AppText variant="bodyStrong" style={{ color: done ? colors.success : colors.textSecondary }}>
              {done ? t("exercises.done") : t("exercises.markDone")}
            </AppText>
          </Pressable>
        ) : role === "teacher" && exercise.completion ? (
          <View style={styles.completion}>
            <View style={styles.flex}>
              <ProgressBar
                progress={exercise.completion.total ? exercise.completion.done / exercise.completion.total : 0}
                color={colors.success}
              />
            </View>
            <AppText variant="caption" tone="secondary" style={styles.pillText}>
              {t("exercises.doneCount", { done: exercise.completion.done, total: exercise.completion.total })}
            </AppText>
          </View>
        ) : role === "parent" && exercise.completed !== null ? (
          <View style={[styles.pill, styles.parentStatus, { backgroundColor: done ? colors.successMuted : colors.surfaceMuted }]}>
            <Icon name={done ? "check" : "clock"} size={13} color={done ? colors.success : colors.textSecondary} />
            <AppText variant="caption" style={[styles.pillText, { color: done ? colors.success : colors.textSecondary }]}>
              {done ? t("exercises.done") : t("exercises.notDone")}
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { flexDirection: "row", padding: 0, overflow: "hidden", gap: 0 },
  stripe: { width: 5 },
  cardBody: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs },
  teacher: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillText: { fontWeight: "700" },
  doneCard: { opacity: 0.8 },
  doneTitle: { textDecorationLine: "line-through" },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 42,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  completion: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs },
  parentStatus: { alignSelf: "flex-start", marginTop: spacing.xs },
});
