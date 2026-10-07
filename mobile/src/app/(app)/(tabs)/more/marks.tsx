import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { fetchMarks } from "@/api/endpoints";
import type { MarkEntry } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Hero } from "@/components/Hero";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { SubjectMark } from "@/components/Subject";
import { AverageBadge, MarkChip } from "@/features/marks/MarkChip";
import { ChildPicker, useSelectedChild } from "@/features/people/ChildPicker";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/dates";
import { showMessage } from "@/lib/dialogs";
import { localize } from "@/lib/localize";
import { spacing } from "@/theme";

/** Students see their marks; parents see a child's (switchable when they have several). */
export default function MarksScreen() {
  const { t, language } = useI18n();
  const params = useLocalSearchParams<{ student?: string }>();
  const [chosen, setChosen] = useState<number | undefined>(params.student ? Number(params.student) : undefined);
  const studentId = useSelectedChild(chosen);

  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["marks", studentId ?? "me"],
    queryFn: () => fetchMarks(studentId),
  });

  const showDetails = (mark: MarkEntry, subject: string) => {
    const lines = [formatDay(mark.date, t), mark.teacher, mark.comment].filter(Boolean).join("\n");
    showMessage(`${subject}: ${mark.value}/${data?.max_mark ?? 10}`, lines);
  };

  const subjects = (data?.subjects ?? []).slice().sort((a, b) => b.marks.length - a.marks.length);
  const total = subjects.reduce((sum, subject) => sum + subject.marks.length, 0);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <ChildPicker value={studentId} onChange={setChosen} />
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <Hero>
            <View style={styles.hero}>
              <View style={styles.flex}>
                <AppText variant="caption" style={styles.whiteMuted}>
                  {data.student.name}
                </AppText>
                <AppText variant="title" style={styles.white}>
                  {t("marks.average")}
                </AppText>
                <AppText variant="caption" style={styles.whiteMuted}>
                  {t("marks.count", { count: total })}
                </AppText>
              </View>
              <View style={styles.heroScore}>
                <AppText variant="display" style={styles.white}>
                  {data.average === null ? "—" : data.average.toFixed(1)}
                </AppText>
                <AppText variant="caption" style={styles.whiteMuted}>
                  / {data.max_mark}
                </AppText>
              </View>
            </View>
          </Hero>

          {total === 0 ? (
            <EmptyState icon="marks" title={t("marks.noMarks")} message={t("marks.noMarksHint")} />
          ) : (
            subjects.map((subject) => {
              const name = localize(subject.subject, language);
              return (
                <Card key={subject.subject_id} style={styles.card}>
                  <View style={styles.header}>
                    <SubjectMark subjectId={subject.subject_id} label={name} size={40} />
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {name}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        {t("marks.count", { count: subject.marks.length })}
                      </AppText>
                    </View>
                    <AverageBadge value={subject.average} />
                  </View>
                  {subject.marks.length ? (
                    <View style={styles.marks}>
                      {subject.marks.map((mark) => (
                        <MarkChip key={mark.id} value={mark.value} onPress={() => showDetails(mark, name)} />
                      ))}
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  white: { color: "#FFFFFF" },
  whiteMuted: { color: "rgba(255, 255, 255, 0.85)" },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroScore: { alignItems: "flex-end" },
  card: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  marks: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
