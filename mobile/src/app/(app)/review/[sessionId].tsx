import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchExamReview } from "@/api/endpoints";
import type { ExamReview } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Badge, ProgressBar } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { SubjectMark } from "@/components/Subject";
import { useI18n } from "@/i18n";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

/** A finished exam, question by question, with the student's and the correct answers. */
export default function ReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["review", sessionId],
    queryFn: () => fetchExamReview(Number(sessionId)),
  });

  const correct = data?.questions.filter((q) => q.is_correct).length ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => router.back()} hitSlop={12}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <Card style={styles.summary}>
              <View style={styles.summaryHeader}>
                <SubjectMark subjectId={data.subject_id} label={localize(data.subject, language)} size={48} />
                <View style={styles.flex}>
                  <AppText variant="subheading" numberOfLines={2}>
                    {data.title}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {localize(data.subject, language)}
                  </AppText>
                </View>
                <AppText variant="title" tone="primary">
                  {t("exams.scoreOf", { score: data.score, max: data.max_score })}
                </AppText>
              </View>
              <ProgressBar progress={data.questions.length ? correct / data.questions.length : 0} color={colors.success} />
              <AppText variant="caption" tone="secondary">
                {t("review.summary", { correct, total: data.questions.length })}
              </AppText>
            </Card>

            {data.questions.map((question, index) => (
              <QuestionReview key={question.id} question={question} number={index + 1} />
            ))}
          </>
        )}
      </Screen>
    </>
  );
}

function QuestionReview({ question, number }: { question: ExamReview["questions"][number]; number: number }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Card style={styles.question}>
      <View style={styles.questionHeader}>
        <AppText variant="label" tone="secondary" style={styles.flex}>
          {t("teacherExams.questionLabel", { number })} · {question.points} {t("teacherExams.pointsLabel").toLowerCase()}
        </AppText>
        <Badge
          label={question.chosen_option_id === null ? t("review.notAnswered") : question.is_correct ? t("review.correct") : t("review.wrong")}
          tone={question.is_correct ? "success" : question.chosen_option_id === null ? "neutral" : "danger"}
        />
      </View>
      <AppText variant="bodyStrong">{question.text}</AppText>

      <View style={styles.options}>
        {question.options.map((option) => {
          const chosen = option.id === question.chosen_option_id;
          const tone = option.is_correct
            ? { color: colors.success, background: colors.successMuted }
            : chosen
              ? { color: colors.danger, background: colors.dangerMuted }
              : { color: colors.textSecondary, background: colors.surfaceMuted };

          return (
            <View key={option.id} style={[styles.option, { backgroundColor: tone.background }]}>
              <Icon
                name={option.is_correct ? "check" : chosen ? "cross" : "circle"}
                size={18}
                color={tone.color}
              />
              <View style={styles.flex}>
                <AppText style={option.is_correct || chosen ? { color: tone.color, fontWeight: "600" } : undefined}>
                  {option.title}
                </AppText>
                {chosen || option.is_correct ? (
                  <AppText variant="caption" style={{ color: tone.color }}>
                    {chosen && option.is_correct
                      ? `${t("review.yourAnswer")} · ${t("review.correct")}`
                      : chosen
                        ? t("review.yourAnswer")
                        : t("review.correctAnswer")}
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: spacing.md },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  question: { gap: spacing.md },
  questionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  options: { gap: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
});
