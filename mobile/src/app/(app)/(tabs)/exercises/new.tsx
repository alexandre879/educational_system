import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { createExercise, fetchDailyExercises } from "@/api/endpoints";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { SelectSheet } from "@/components/SelectSheet";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { addDays, toISODate } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

const DUE_OPTIONS = [null, 1, 2, 7] as const;

export default function NewExerciseScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = toISODate(new Date());

  // The teacher's subjects come with today's exercise list.
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["exercises", today],
    queryFn: () => fetchDailyExercises(today),
  });

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueInDays, setDueInDays] = useState<(typeof DUE_OPTIONS)[number]>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const subjects = data?.subjects ?? [];
  const subject = subjects.find((s) => s.id === subjectId);
  const subjectLabel = (s: (typeof subjects)[number]) =>
    `${localize(s.name, language)} · ${s.grade.name} ${localize(s.grade.category_name, language)}`.trim();

  const save = useMutation({
    mutationFn: () =>
      createExercise({
        grade_id: subject!.grade.id,
        subject_id: subject!.id,
        title: title.trim(),
        description: description.trim(),
        date: today,
        due_date: dueInDays ? toISODate(addDays(new Date(), dueInDays)) : null,
      }),
    onSuccess: async () => {
      toast(t("exercises.created"));
      await queryClient.invalidateQueries({ queryKey: ["exercises"] });
      router.back();
    },
    onError: (saveError) => toast(actionErrorMessage(saveError, t, t("exercises.createFailed")), "error"),
  });

  const dueLabel = (option: (typeof DUE_OPTIONS)[number]) =>
    option === null
      ? t("exercises.noDue")
      : option === 1
        ? t("exercises.tomorrow")
        : option === 7
          ? t("exercises.nextWeek")
          : t("exercises.inDays", { count: option });

  if (isPending) return <LoadingState variant="spinner" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <Screen>
      {subjects.length === 0 ? (
        <EmptyState icon="exercises" title={t("exercises.noSubjects")} />
      ) : (
        <>
          <AppText variant="caption" tone="secondary">
            {t("exercises.subjectLabel")}
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <AppText tone={subject ? "text" : "muted"} style={styles.flex} numberOfLines={1}>
              {subject ? subjectLabel(subject) : t("exercises.subjectPlaceholder")}
            </AppText>
            <Icon name="chevronRight" size={16} color={colors.textMuted} />
          </Pressable>

          <TextField
            label={t("exercises.titleLabel")}
            placeholder={t("exercises.titlePlaceholder")}
            value={title}
            onChangeText={setTitle}
            maxLength={255}
          />
          <TextField
            label={t("exercises.descriptionLabel")}
            placeholder={t("exercises.descriptionPlaceholder")}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <AppText variant="caption" tone="secondary">
            {t("exercises.dueLabel")}
          </AppText>
          <View style={styles.dueRow}>
            {DUE_OPTIONS.map((option) => (
              <Chip
                key={String(option)}
                label={dueLabel(option)}
                selected={dueInDays === option}
                onPress={() => setDueInDays(option)}
              />
            ))}
          </View>

          <Button
            title={t("common.save")}
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={!subject || !title.trim()}
          />

          <SelectSheet
            visible={pickerOpen}
            title={t("exercises.subjectPlaceholder")}
            options={subjects.map((s) => ({ value: s.id, label: subjectLabel(s) }))}
            selected={subjectId}
            onSelect={setSubjectId}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dueRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
