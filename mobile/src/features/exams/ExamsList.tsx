import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { fetchExamHistory, fetchExams } from "@/api/endpoints";
import type { ExamHistoryItem, ExamListItem } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SegmentedControl } from "@/components/Controls";
import { Icon, type IconName } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { SubjectMark } from "@/components/Subject";
import { useI18n } from "@/i18n";
import { formatRelative } from "@/lib/dates";
import { confirmAction } from "@/lib/dialogs";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

type Tab = "available" | "results";

export function ExamsList() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "results" ? "results" : "available");

  // "Results" shortcuts (home, notifications) can switch the tab while it's open.
  const [lastParamTab, setLastParamTab] = useState(params.tab);
  if (params.tab !== lastParamTab) {
    setLastParamTab(params.tab);
    if (params.tab === "results" || params.tab === "available") setTab(params.tab);
  }

  const exams = useQuery({ queryKey: ["exams"], queryFn: fetchExams, enabled: tab === "available" });
  const history = useQuery({ queryKey: ["examHistory"], queryFn: () => fetchExamHistory(), enabled: tab === "results" });
  const active = tab === "available" ? exams : history;

  const start = (exam: ExamListItem) => {
    confirmAction({
      title: t("exams.startTitle"),
      message: t("exams.startMessage", { minutes: exam.duration }),
      confirmText: t("exams.start"),
      cancelText: t("common.cancel"),
      onConfirm: () => router.push({ pathname: "/exam/[id]", params: { id: String(exam.id) } }),
    });
  };

  return (
    <Screen onRefresh={active.refetch} refreshing={active.isRefetching}>
      <SegmentedControl
        options={[
          { value: "available" as Tab, label: t("exams.available") },
          { value: "results" as Tab, label: t("exams.completed") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "results" ? (
        <ExamResults items={history.data} error={history.error} pending={history.isPending} onRetry={history.refetch} />
      ) : exams.isPending ? (
        <LoadingState />
      ) : exams.error ? (
        <ErrorState error={exams.error} onRetry={exams.refetch} />
      ) : exams.data.length === 0 ? (
        <EmptyState icon="exams" title={t("exams.empty")} message={t("exams.emptyHint")} />
      ) : (
        exams.data.map((exam) => (
          <Card key={exam.id} style={styles.card}>
            <View style={styles.header}>
              <SubjectMark subjectId={exam.subject_id} label={exam.subject || exam.title} size={48} />
              <View style={styles.flex}>
                <AppText variant="subheading" numberOfLines={2}>
                  {exam.title}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {exam.subject}
                </AppText>
              </View>
            </View>
            <View style={styles.meta}>
              <MetaChip icon="timer" label={t("common.minutes", { count: exam.duration })} />
              <MetaChip icon="exams" label={t("exams.questionsCount", { count: exam.questions_count })} />
            </View>
            <Button title={t("exams.start")} icon="timer" variant="gradient" onPress={() => start(exam)} />
          </Card>
        ))
      )}
    </Screen>
  );
}

function ExamResults({
  items,
  error,
  pending,
  onRetry,
}: {
  items: ExamHistoryItem[] | undefined;
  error: unknown;
  pending: boolean;
  onRetry: () => void;
}) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  if (pending) return <LoadingState />;
  if (error || !items) return <ErrorState error={error} onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState icon="results" title={t("exams.noResults")} />;

  return (
    <>
      {items.map((item) => {
        const ratio = item.max_score ? item.score / item.max_score : 0;
        const tone =
          ratio >= 0.8
            ? { color: colors.success, background: colors.successMuted }
            : ratio >= 0.5
              ? { color: colors.warning, background: colors.warningMuted }
              : { color: colors.danger, background: colors.dangerMuted };
        const subject = localize(item.subject, language);

        return (
          <Card
            key={item.session_id}
            accessibilityLabel={item.title}
            onPress={() => router.push({ pathname: "/review/[sessionId]", params: { sessionId: String(item.session_id) } })}
            style={styles.resultCard}
          >
            <SubjectMark subjectId={item.subject_id} label={subject || item.title} size={44} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {t("exams.correctOf", { correct: item.correct, total: item.total_questions })}
                {item.submitted_at ? ` · ${formatRelative(item.submitted_at, t)}` : ""}
                {item.timed_out ? ` · ${t("exams.timedOut")}` : ""}
              </AppText>
            </View>
            <View style={[styles.score, { backgroundColor: tone.background }]}>
              <AppText variant="bodyStrong" style={{ color: tone.color }}>
                {t("exams.scoreOf", { score: item.score, max: item.max_score })}
              </AppText>
            </View>
            <Icon name="chevronRight" size={14} color={colors.textMuted} />
          </Card>
        );
      })}
    </>
  );
}

function MetaChip({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
      <Icon name={icon} size={14} color={colors.textSecondary} />
      <AppText variant="caption" tone="secondary" style={styles.chipText}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: { fontWeight: "600" },
  resultCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  score: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
});
