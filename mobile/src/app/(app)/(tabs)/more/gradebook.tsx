import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { deleteMark, fetchGradebook, fetchMySubjects, giveMark } from "@/api/endpoints";
import type { Gradebook, MarkEntry } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Chip, ChipRow } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { AverageBadge, MarkChip } from "@/features/marks/MarkChip";
import { MarkSheet } from "@/features/marks/MarkSheet";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/dates";
import { confirmAction } from "@/lib/dialogs";
import { localize } from "@/lib/localize";
import { spacing, useTheme } from "@/theme";

type Student = Gradebook["students"][number];

/** A teacher's class list for one subject: every student's marks, with quick entry. */
export default function GradebookScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const subjects = useQuery({ queryKey: ["mySubjects"], queryFn: fetchMySubjects });
  const [chosenId, setChosenId] = useState<number | null>(null);
  const subject = (subjects.data ?? []).find((s) => s.pk === chosenId) ?? subjects.data?.[0];

  const book = useQuery({
    queryKey: ["gradebook", subject?.pk],
    queryFn: () => fetchGradebook(subject!.pk),
    enabled: !!subject,
  });

  const [student, setStudent] = useState<Student | null>(null);

  const save = useMutation({
    mutationFn: ({ value, comment }: { value: number; comment: string }) =>
      giveMark({ student_id: student!.id, subject_id: subject!.pk, value, comment }),
    onSuccess: () => {
      toast(t("gradebook.saved"));
      setStudent(null);
      void queryClient.invalidateQueries({ queryKey: ["gradebook", subject?.pk] });
    },
    onError: (saveError) => toast(actionErrorMessage(saveError, t, t("gradebook.saveFailed")), "error"),
  });

  const remove = useMutation({
    mutationFn: (markId: number) => deleteMark(markId),
    onSuccess: () => {
      toast(t("gradebook.deleted"));
      void queryClient.invalidateQueries({ queryKey: ["gradebook", subject?.pk] });
    },
    onError: (removeError) => toast(actionErrorMessage(removeError, t, t("common.genericError")), "error"),
  });

  const confirmDelete = (mark: MarkEntry) =>
    confirmAction({
      title: t("gradebook.deleteTitle"),
      message: t("gradebook.deleteMessage", { value: mark.value, date: formatDay(mark.date, t) }),
      confirmText: t("gradebook.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => remove.mutate(mark.id),
    });

  const refresh = () => {
    void subjects.refetch();
    if (subject) void book.refetch();
  };

  return (
    <Screen onRefresh={refresh} refreshing={subjects.isRefetching || book.isRefetching}>
      {subjects.isPending ? (
        <LoadingState />
      ) : subjects.error ? (
        <ErrorState error={subjects.error} onRetry={subjects.refetch} />
      ) : !subject ? (
        <EmptyState icon="gradebook" title={t("gradebook.noSubjects")} />
      ) : (
        <>
          <ChipRow>
            {(subjects.data ?? []).map((s) => (
              <Chip
                key={s.pk}
                label={`${localize(s.name, language)} · ${s.grade__name} ${localize(s.grade__category__name, language)}`.trim()}
                selected={s.pk === subject.pk}
                onPress={() => setChosenId(s.pk)}
              />
            ))}
          </ChipRow>

          {book.isPending ? (
            <LoadingState />
          ) : book.error ? (
            <ErrorState error={book.error} onRetry={book.refetch} />
          ) : book.data.students.length === 0 ? (
            <EmptyState icon="person" title={t("gradebook.noStudents")} />
          ) : (
            book.data.students.map((row) => (
              <Card key={row.id} style={styles.card}>
                <View style={styles.header}>
                  <Avatar uri={row.profilePic} name={row.name} size={40} />
                  <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                    {row.name}
                  </AppText>
                  <AverageBadge value={row.average} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("gradebook.addMark")}
                    onPress={() => setStudent(row)}
                    hitSlop={8}
                    style={[styles.add, { backgroundColor: colors.primary }]}
                  >
                    <Icon name="add" size={18} color={colors.onPrimary} />
                  </Pressable>
                </View>
                {row.marks.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marks}>
                    {row.marks.map((mark) => (
                      <MarkChip key={mark.id} value={mark.value} size={34} onPress={() => confirmDelete(mark)} />
                    ))}
                  </ScrollView>
                ) : (
                  <AppText variant="caption" tone="muted">
                    {t("gradebook.noMarks")}
                  </AppText>
                )}
              </Card>
            ))
          )}
        </>
      )}

      <MarkSheet
        studentName={student?.name ?? null}
        maxMark={book.data?.max_mark ?? 10}
        saving={save.isPending}
        onSave={(value, comment) => save.mutate({ value, comment })}
        onClose={() => setStudent(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  add: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  marks: { gap: spacing.sm },
});
