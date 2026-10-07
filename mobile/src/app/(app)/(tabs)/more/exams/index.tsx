import { useQuery } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchTeacherExams } from "@/api/endpoints";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon, type IconName } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { SubjectBadge } from "@/components/Subject";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

/** Exams in the subjects a teacher teaches, with how the class did so far. */
export default function TeacherExamsScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["teacherExams"],
    queryFn: fetchTeacherExams,
  });

  const create = () => router.push("/more/exams/new");

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("teacherExams.create")}
              onPress={create}
              hitSlop={12}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Icon name="add" size={18} color={colors.onPrimary} />
            </Pressable>
          ),
        }}
      />
      <Screen onRefresh={refetch} refreshing={isRefetching}>
        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState
            icon="exams"
            title={t("teacherExams.empty")}
            message={t("teacherExams.emptyHint")}
            action={<Button title={t("teacherExams.create")} icon="add" variant="gradient" onPress={create} />}
          />
        ) : (
          data.map((exam) => (
            <Card key={exam.id} style={styles.card}>
              <View style={styles.badges}>
                <SubjectBadge subjectId={exam.subject_id} label={localize(exam.subject, language)} />
                <View style={[styles.pill, { backgroundColor: colors.surfaceMuted }]}>
                  <AppText variant="caption" tone="secondary" style={styles.pillText}>
                    {`${t("common.grade")} ${exam.grade.name} ${localize(exam.grade.category_name, language)}`.trim()}
                  </AppText>
                </View>
              </View>
              <AppText variant="subheading">{localize(exam.title, language)}</AppText>
              <View style={styles.meta}>
                <Meta icon="exams" label={t("teacherExams.questions", { count: exam.questions_count })} />
                <Meta icon="timer" label={t("common.minutes", { count: exam.duration })} />
                {exam.scheduled_for ? <Meta icon="calendar" label={formatDay(exam.scheduled_for, t)} /> : null}
              </View>
              <View style={[styles.results, { borderTopColor: colors.border }]}>
                <Meta icon="person" label={t("teacherExams.submissions", { count: exam.submissions })} />
                {exam.average_score !== null ? (
                  <AppText variant="bodyStrong" tone="primary">
                    {t("teacherExams.average", { score: exam.average_score, max: exam.max_score })}
                  </AppText>
                ) : null}
              </View>
            </Card>
          ))
        )}
      </Screen>
    </>
  );
}

function Meta({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={14} color={colors.textMuted} />
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  card: { gap: spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  pill: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontWeight: "700" },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  results: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
});
