import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { errorStatus } from "@/api/client";
import { startOrResumeExam, submitAnswer } from "@/api/endpoints";
import { isExamResult, type ExamQuestionState, type ExamResult, type ExamState } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Confetti } from "@/components/Confetti";
import { Icon } from "@/components/Icon";
import { Hero } from "@/components/Hero";
import { ErrorState, LoadingState } from "@/components/States";
import { useI18n } from "@/i18n";
import { formatCountdown } from "@/lib/dates";
import { confirmAction, showMessage } from "@/lib/dialogs";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

const OPTION_LETTERS: Record<string, string[]> = {
  en: "ABCDEFGHIJ".split(""),
  ka: ["ა", "ბ", "გ", "დ", "ე", "ვ", "ზ", "თ", "ი", "კ"],
  ru: ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "К"],
};

export default function ExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const examId = Number(id);
  const { t } = useI18n();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [state, setState] = useState<ExamState | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [submittingOption, setSubmittingOption] = useState<number | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [locked, setLocked] = useState(false);
  const finishingRef = useRef(false);

  const question = state && !isExamResult(state) ? state : null;
  const endsAt = question?.ends_at ?? null;

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/study");
  }, []);

  const handleLoadError = useCallback(
    (error: unknown) => {
      const status = errorStatus(error);
      if (status === 400 || status === 403 || status === 404) {
        showMessage(status === 400 ? t("exam.alreadyCompleted") : t("exam.unavailable"));
        leave();
        return;
      }
      setLoadError(error);
    },
    [leave, t]
  );

  /** Start, resume or (after the deadline) finish the session on the server. */
  const loadSession = useCallback(async () => {
    try {
      setState(await startOrResumeExam(examId));
    } catch (error) {
      handleLoadError(error);
    }
  }, [examId, handleLoadError]);

  useEffect(() => {
    let ignore = false;
    startOrResumeExam(examId).then(
      (next) => {
        if (!ignore) setState(next);
      },
      (error) => {
        if (!ignore) handleLoadError(error);
      }
    );
    return () => {
      ignore = true;
    };
  }, [examId, handleLoadError]);

  // Once finished, the exam list and dashboard are out of date.
  useEffect(() => {
    if (state && isExamResult(state)) {
      void queryClient.invalidateQueries({ queryKey: ["exams"] });
      void queryClient.invalidateQueries({ queryKey: ["examHistory"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, [state, queryClient]);

  const finishDueToTimeout = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    try {
      const next = await startOrResumeExam(examId);
      if (!isExamResult(next)) {
        // The server's clock hasn't reached the deadline yet; the timer retries shortly.
        setTimeout(() => {
          finishingRef.current = false;
        }, 2000);
        return;
      }
      setState(next);
    } catch {
      finishingRef.current = false;
    }
  }, [examId]);

  useEffect(() => {
    if (!endsAt) return;
    const deadline = new Date(endsAt).getTime();

    const tick = () => {
      const left = deadline - Date.now();
      setTimeLeftMs(Math.max(0, left));
      if (left <= 0) {
        setLocked(true);
        void finishDueToTimeout();
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt, finishDueToTimeout]);

  const confirmLeave = useCallback(() => {
    if (!question) {
      leave();
      return;
    }
    confirmAction({
      title: t("exam.leaveTitle"),
      message: t("exam.leaveMessage"),
      confirmText: t("exam.leave"),
      cancelText: t("exam.stay"),
      destructive: true,
      onConfirm: leave,
    });
  }, [question, leave, t]);

  // Android back button asks before leaving a running exam.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      confirmLeave();
      return true;
    });
    return () => subscription.remove();
  }, [confirmLeave]);

  const answer = async (current: ExamQuestionState, optionId: number) => {
    if (locked || submittingOption !== null) return;

    Haptics.selectionAsync().catch(() => undefined);
    setSubmittingOption(optionId);
    try {
      setState(await submitAnswer(current.session_id, current.current_question.id, optionId));
    } catch (error) {
      const status = errorStatus(error);
      // Out of sync (double tap, finished elsewhere, time ran out): reload the real state.
      if (status === 400 || status === 403 || status === 409) await loadSession();
      else showMessage(t("common.errorTitle"), t("common.networkError"));
    } finally {
      setSubmittingOption(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={confirmLeave}
          hitSlop={12}
          style={[styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Icon name="close" size={18} color={colors.text} />
        </Pressable>
        {question ? (
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex} center>
            {t("exam.progress", { current: question.current_index + 1, total: question.len_questions })}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        {question && endsAt ? (
          <View style={[styles.timer, { backgroundColor: timeLeftMs <= 60_000 ? colors.dangerMuted : colors.primaryMuted }]}>
            <Icon name="timer" size={16} color={timeLeftMs <= 60_000 ? colors.danger : colors.primary} />
            <AppText variant="bodyStrong" tone={timeLeftMs <= 60_000 ? "danger" : "primary"} style={styles.timerText}>
              {formatCountdown(timeLeftMs)}
            </AppText>
          </View>
        ) : (
          <View style={styles.timerPlaceholder} />
        )}
      </View>

      {state === null ? (
        loadError ? (
          <ErrorState
            error={loadError}
            onRetry={() => {
              setLoadError(null);
              void loadSession();
            }}
          />
        ) : (
          <LoadingState variant="spinner" />
        )
      ) : isExamResult(state) ? (
        <ResultView result={state} onDone={leave} />
      ) : (
        <QuestionView state={state} submittingOption={submittingOption} locked={locked} onAnswer={answer} />
      )}
    </SafeAreaView>
  );
}

function QuestionView({
  state,
  submittingOption,
  locked,
  onAnswer,
}: {
  state: ExamQuestionState;
  submittingOption: number | null;
  locked: boolean;
  onAnswer: (state: ExamQuestionState, optionId: number) => void;
}) {
  const { language } = useI18n();
  const { colors } = useTheme();
  const examLanguage = state.exam_language || language;
  const letters = OPTION_LETTERS[examLanguage] ?? OPTION_LETTERS.en;
  const title = localize(state.title, examLanguage) || localize(state.subject, examLanguage);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* One segment per question: done, current, upcoming. */}
      <View style={styles.segments}>
        {Array.from({ length: state.len_questions }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor:
                  index < state.current_index
                    ? colors.primary
                    : index === state.current_index
                      ? colors.accent
                      : colors.surfaceMuted,
              },
            ]}
          />
        ))}
      </View>

      <Card style={styles.questionCard}>
        <AppText variant="label" tone="primary" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="heading" style={styles.question}>
          {localize(state.current_question.text, examLanguage)}
        </AppText>
      </Card>

      {state.current_question.options.map((option, index) => {
        const submitting = submittingOption === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            disabled={locked || submittingOption !== null}
            onPress={() => onAnswer(state, option.id)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: submitting ? colors.primary : colors.surface,
                borderColor: submitting ? colors.primary : colors.border,
                boxShadow: colors.shadow,
                opacity: locked ? 0.5 : 1,
              },
              pressed && !submitting && styles.optionPressed,
            ]}
          >
            <View style={[styles.letter, { backgroundColor: submitting ? "rgba(255, 255, 255, 0.22)" : colors.primaryMuted }]}>
              <AppText variant="bodyStrong" style={{ color: submitting ? colors.onPrimary : colors.primary }}>
                {letters[index] ?? index + 1}
              </AppText>
            </View>
            <AppText style={[styles.flex, submitting && { color: colors.onPrimary }]}>
              {localize(option.title, examLanguage)}
            </AppText>
            {submitting ? <ActivityIndicator color={colors.onPrimary} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ResultView({ result, onDone }: { result: ExamResult; onDone: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  // 80% or more of the possible points earns a celebration.
  const great = !!result.max_score && result.final_score / result.max_score >= 0.8;
  const sessionId = result.session_id;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Hero>
          <View style={styles.resultHero}>
            <View style={styles.resultIcon}>
              <Icon name={result.timed_out ? "timer" : "leaderboard"} size={36} color="#FFFFFF" />
            </View>
            <AppText variant="title" style={styles.white} center>
              {result.timed_out ? t("exam.timeUpTitle") : t("exam.completedTitle")}
            </AppText>
            <AppText style={styles.whiteMuted} center>
              {result.timed_out ? t("exam.timeUpMessage") : t("exam.completedMessage")}
            </AppText>
            <AppText variant="display" style={[styles.white, styles.score]}>
              {result.max_score ? t("exams.scoreOf", { score: result.final_score, max: result.max_score }) : result.final_score}
            </AppText>
            <AppText variant="label" style={styles.whiteMuted}>
              {great ? t("exam.greatScore") : t("exam.score")}
            </AppText>
          </View>
        </Hero>

        <View style={styles.resultStats}>
          <ResultStat label={t("exam.totalQuestions")} value={result.total_questions} color={colors.primary} />
          <ResultStat label={t("exam.subjectPoints")} value={result.subject_points} color={colors.accent} />
          <ResultStat label={t("exam.totalPoints")} value={result.global_points} color={colors.warning} />
        </View>

        {sessionId ? (
          <Button
            title={t("exam.reviewAnswers")}
            icon="results"
            variant="secondary"
            onPress={() => router.replace({ pathname: "/review/[sessionId]", params: { sessionId: String(sessionId) } })}
          />
        ) : null}
        <Button title={t("exam.backToExams")} variant="gradient" onPress={onDone} />
      </ScrollView>
      {great ? <Confetti /> : null}
    </View>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={styles.resultStat}>
      <AppText variant="heading" style={{ color }}>
        {value}
      </AppText>
      <AppText variant="caption" tone="secondary" center numberOfLines={2}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  white: { color: "#FFFFFF" },
  whiteMuted: { color: "rgba(255, 255, 255, 0.85)" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  timerText: { fontVariant: ["tabular-nums"] },
  timerPlaceholder: { width: 36 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  segments: { flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  questionCard: { gap: spacing.sm, padding: spacing.xl, marginBottom: spacing.xs },
  question: { fontSize: 22, lineHeight: 30 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minHeight: 64,
  },
  optionPressed: { transform: [{ scale: 0.98 }] },
  letter: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resultHero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: spacing.sm,
  },
  score: { fontSize: 64, lineHeight: 70, marginTop: spacing.md },
  resultStats: { flexDirection: "row", gap: spacing.sm },
  resultStat: { flex: 1, alignItems: "center", gap: 4, padding: spacing.md },
});
