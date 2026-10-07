import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { createExam, fetchMySubjects } from "@/api/endpoints";
import type { MySubject } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { SelectSheet } from "@/components/SelectSheet";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { addDays, formatDay, toISODate } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

const DURATIONS = [10, 15, 20, 30, 45, 60];
const DATE_OFFSETS = [null, 1, 3, 7] as const;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const LETTERS = "ABCDEF".split("");

interface DraftOption {
  key: string;
  title: string;
  correct: boolean;
}

interface DraftQuestion {
  key: string;
  text: string;
  points: number;
  options: DraftOption[];
}

const newKey = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const newOption = (): DraftOption => ({ key: newKey(), title: "", correct: false });
const newQuestion = (): DraftQuestion => ({ key: newKey(), text: "", points: 1, options: [newOption(), newOption(), newOption()] });

/** A teacher writes a multiple-choice exam; publishing notifies the class. */
export default function NewExamScreen() {
  const { t, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const subjects = useQuery({ queryKey: ["mySubjects"], queryFn: fetchMySubjects });
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(20);
  const [dateOffset, setDateOffset] = useState<(typeof DATE_OFFSETS)[number]>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [newQuestion()]);

  const subject = subjects.data?.find((s) => s.pk === subjectId);
  const subjectLabel = (s: MySubject) =>
    `${localize(s.name, language)} · ${s.grade__name} ${localize(s.grade__category__name, language)}`.trim();

  const updateQuestion = (key: string, change: (question: DraftQuestion) => DraftQuestion) =>
    setQuestions((current) => current.map((q) => (q.key === key ? change(q) : q)));

  const complete =
    !!subject &&
    !!title.trim() &&
    questions.every(
      (q) => q.text.trim() && q.options.every((o) => o.title.trim()) && q.options.some((o) => o.correct)
    );

  const publish = useMutation({
    mutationFn: () =>
      createExam({
        subject_id: subject!.pk,
        title: title.trim(),
        duration,
        scheduled_for: dateOffset ? toISODate(addDays(new Date(), dateOffset)) : null,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          points: q.points,
          options: q.options.map((o) => ({ title: o.title.trim(), is_correct: o.correct })),
        })),
      }),
    onSuccess: async () => {
      toast(t("teacherExams.published"));
      await queryClient.invalidateQueries({ queryKey: ["teacherExams"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
      router.back();
    },
    onError: (publishError) => toast(actionErrorMessage(publishError, t, t("teacherExams.publishFailed")), "error"),
  });

  if (subjects.isPending) return <LoadingState variant="spinner" />;
  if (subjects.error) return <ErrorState error={subjects.error} onRetry={subjects.refetch} />;
  if (!subjects.data.length) return <EmptyState icon="exams" title={t("gradebook.noSubjects")} />;

  return (
    <Screen>
      <Card style={styles.section}>
        <FieldLabel>{t("teacherExams.subjectLabel")}</FieldLabel>
        <Picker
          label={subject ? subjectLabel(subject) : t("teacherExams.subjectPlaceholder")}
          placeholder={!subject}
          onPress={() => setPickerOpen(true)}
        />
        <TextField
          label={t("teacherExams.titleLabel")}
          placeholder={t("teacherExams.titlePlaceholder")}
          value={title}
          onChangeText={setTitle}
          maxLength={255}
        />
        <FieldLabel>{t("teacherExams.durationLabel")}</FieldLabel>
        <View style={styles.chips}>
          {DURATIONS.map((minutes) => (
            <Chip
              key={minutes}
              label={t("common.minutes", { count: minutes })}
              selected={duration === minutes}
              onPress={() => setDuration(minutes)}
            />
          ))}
        </View>
        <FieldLabel>{t("teacherExams.dateLabel")}</FieldLabel>
        <View style={styles.chips}>
          {DATE_OFFSETS.map((offset) => (
            <Chip
              key={String(offset)}
              label={offset === null ? t("teacherExams.noDate") : formatDay(addDays(new Date(), offset), t)}
              selected={dateOffset === offset}
              onPress={() => setDateOffset(offset)}
            />
          ))}
        </View>
      </Card>

      <AppText variant="caption" tone="secondary">
        {t("teacherExams.markCorrect")}
      </AppText>

      {questions.map((question, index) => (
        <QuestionEditor
          key={question.key}
          question={question}
          number={index + 1}
          canRemove={questions.length > 1}
          onChange={(change) => updateQuestion(question.key, change)}
          onRemove={() => setQuestions((current) => current.filter((q) => q.key !== question.key))}
        />
      ))}

      <Button
        title={t("teacherExams.addQuestion")}
        icon="add"
        variant="secondary"
        onPress={() => setQuestions((current) => [...current, newQuestion()])}
      />
      {!complete ? (
        <AppText variant="caption" tone="muted" center>
          {t("teacherExams.incomplete")}
        </AppText>
      ) : null}
      <Button
        title={t("teacherExams.publish")}
        icon="exams"
        variant="gradient"
        loading={publish.isPending}
        disabled={!complete}
        onPress={() => publish.mutate()}
      />

      <SelectSheet
        visible={pickerOpen}
        title={t("teacherExams.subjectPlaceholder")}
        options={subjects.data.map((s) => ({ value: s.pk, label: subjectLabel(s) }))}
        selected={subjectId}
        onSelect={setSubjectId}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

function QuestionEditor({
  question,
  number,
  canRemove,
  onChange,
  onRemove,
}: {
  question: DraftQuestion;
  number: number;
  canRemove: boolean;
  onChange: (change: (question: DraftQuestion) => DraftQuestion) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const setOption = (key: string, change: Partial<DraftOption>) =>
    onChange((q) => ({ ...q, options: q.options.map((o) => (o.key === key ? { ...o, ...change } : o)) }));
  // One correct answer per question: picking one clears the others.
  const markCorrect = (key: string) =>
    onChange((q) => ({ ...q, options: q.options.map((o) => ({ ...o, correct: o.key === key })) }));

  return (
    <Card style={styles.section}>
      <View style={styles.questionHeader}>
        <AppText variant="subheading" style={styles.flex}>
          {t("teacherExams.questionLabel", { number })}
        </AppText>
        <Stepper
          value={question.points}
          label={t("teacherExams.pointsLabel")}
          onChange={(points) => onChange((q) => ({ ...q, points }))}
        />
        {canRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("teacherExams.removeQuestion")} onPress={onRemove} hitSlop={8}>
            <Icon name="trash" size={20} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
      <TextField
        placeholder={t("teacherExams.questionPlaceholder")}
        value={question.text}
        onChangeText={(text) => onChange((q) => ({ ...q, text }))}
        multiline
        maxLength={2000}
      />

      {question.options.map((option, index) => (
        <View key={option.key} style={styles.optionRow}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: option.correct }}
            onPress={() => markCorrect(option.key)}
            hitSlop={8}
          >
            <Icon name={option.correct ? "check" : "circle"} size={24} color={option.correct ? colors.success : colors.textMuted} />
          </Pressable>
          <TextInput
            value={option.title}
            onChangeText={(title) => setOption(option.key, { title })}
            placeholder={t("teacherExams.optionPlaceholder", { letter: LETTERS[index] })}
            placeholderTextColor={colors.textMuted}
            maxLength={500}
            style={[
              styles.optionInput,
              {
                color: colors.text,
                backgroundColor: option.correct ? colors.successMuted : colors.surfaceMuted,
              },
            ]}
          />
          {question.options.length > MIN_OPTIONS ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange((q) => ({ ...q, options: q.options.filter((o) => o.key !== option.key) }))}
              hitSlop={8}
            >
              <Icon name="minus" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}

      {question.options.length < MAX_OPTIONS ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange((q) => ({ ...q, options: [...q.options, newOption()] }))}
          style={styles.addOption}
          hitSlop={6}
        >
          <Icon name="add" size={16} color={colors.primary} />
          <AppText variant="bodyStrong" tone="primary">
            {t("teacherExams.addOption")}
          </AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}

function Stepper({ value, label, onChange }: { value: number; label: string; onChange: (value: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: colors.surfaceMuted }]} accessibilityLabel={`${label}: ${value}`}>
      <Pressable accessibilityRole="button" onPress={() => onChange(Math.max(1, value - 1))} hitSlop={6}>
        <Icon name="minus" size={14} color={colors.textSecondary} />
      </Pressable>
      <AppText variant="bodyStrong" style={styles.stepperValue}>
        {value}
      </AppText>
      <Pressable accessibilityRole="button" onPress={() => onChange(Math.min(10, value + 1))} hitSlop={6}>
        <Icon name="add" size={14} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <AppText variant="caption" tone="secondary">
      {children}
    </AppText>
  );
}

function Picker({ label, placeholder, onPress }: { label: string; placeholder: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <AppText tone={placeholder ? "muted" : "text"} style={styles.flex} numberOfLines={1}>
        {label}
      </AppText>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  questionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  optionInput: { flex: 1, minHeight: 44, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16 },
  addOption: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  stepperValue: { minWidth: 18, textAlign: "center" },
});
