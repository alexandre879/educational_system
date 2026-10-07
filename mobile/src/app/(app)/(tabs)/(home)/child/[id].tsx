import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchAttendanceHistory, fetchExamHistory, fetchMarks } from "@/api/endpoints";
import type { AttendanceHistory } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card, SectionHeader } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { SubjectBadge, SubjectMark } from "@/components/Subject";
import { AverageBadge } from "@/features/marks/MarkChip";
import { useChildren } from "@/features/people/ChildPicker";
import { useI18n } from "@/i18n";
import {
  addMonths,
  formatDay,
  formatMonth,
  formatRelative,
  isoWeekday,
  monthGrid,
  toISODate,
  toISOMonth,
  weekdayName,
  type IsoWeekday,
} from "@/lib/dates";
import { localize } from "@/lib/localize";
import { fullName } from "@/lib/people";
import { radius, spacing, useTheme } from "@/theme";

const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Everything a parent wants to know about one child: attendance by month, marks and exam results. */
export default function ChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const childId = Number(id);
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const child = useChildren().find((c) => c.id === childId);

  const [month, setMonth] = useState(() => addMonths(new Date(), 0));
  const monthKey = toISOMonth(month);

  const attendance = useQuery({
    queryKey: ["attendanceHistory", childId, monthKey],
    queryFn: () => fetchAttendanceHistory(monthKey, childId),
    placeholderData: keepPreviousData,
  });
  const marks = useQuery({ queryKey: ["marks", childId], queryFn: () => fetchMarks(childId) });
  const exams = useQuery({ queryKey: ["examHistory", childId], queryFn: () => fetchExamHistory(childId) });

  const refresh = () => {
    void attendance.refetch();
    void marks.refetch();
    void exams.refetch();
  };

  const name = child ? fullName(child) : "";
  const subjectsWithMarks = (marks.data?.subjects ?? []).filter((s) => s.marks.length > 0);

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <Screen onRefresh={refresh} refreshing={attendance.isRefetching || marks.isRefetching || exams.isRefetching}>
        {child ? (
          <Card style={styles.profile}>
            <View style={styles.row}>
              <Avatar uri={child.profilePic} name={name} size={56} />
              <View style={styles.flex}>
                <AppText variant="heading">{name}</AppText>
                {child.grade ? (
                  <AppText variant="caption" tone="secondary">
                    {`${t("common.grade")} ${child.grade.name} ${localize(child.grade.category_name, language)}`.trim()}
                  </AppText>
                ) : null}
              </View>
            </View>
            <View style={styles.stats}>
              <Stat label={t("home.averageMark")} value={child.average_mark === null ? "—" : child.average_mark.toFixed(1)} />
              <Stat label={t("home.attendanceRate")} value={child.attendance_rate === null ? "—" : `${child.attendance_rate}%`} />
              <Stat label={t("home.pendingHomework")} value={String(child.pending_homework)} />
            </View>
          </Card>
        ) : null}

        <SectionHeader title={t("child.attendance")} />
        <Card style={styles.attendance}>
          <View style={styles.monthHeader}>
            <Pressable accessibilityRole="button" onPress={() => setMonth((m) => addMonths(m, -1))} hitSlop={10}>
              <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
            </Pressable>
            <AppText variant="subheading" center style={styles.flex}>
              {formatMonth(month, t)}
            </AppText>
            <Pressable accessibilityRole="button" onPress={() => setMonth((m) => addMonths(m, 1))} hitSlop={10}>
              <Icon name="chevronRight" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {attendance.isPending ? (
            <LoadingState variant="spinner" />
          ) : attendance.error ? (
            <ErrorState error={attendance.error} onRetry={attendance.refetch} />
          ) : (
            <AttendanceMonth month={month} history={attendance.data} />
          )}
        </Card>

        <SectionHeader
          title={t("child.marks")}
          actionLabel={t("child.viewAll")}
          onAction={() => router.push({ pathname: "/more/marks", params: { student: String(childId) } })}
        />
        <Card style={styles.list}>
          {marks.isPending ? (
            <LoadingState variant="spinner" />
          ) : subjectsWithMarks.length === 0 ? (
            <AppText tone="secondary">{t("marks.noMarks")}</AppText>
          ) : (
            subjectsWithMarks.map((subject) => (
              <View key={subject.subject_id} style={styles.row}>
                <SubjectMark subjectId={subject.subject_id} label={localize(subject.subject, language)} size={36} />
                <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                  {localize(subject.subject, language)}
                </AppText>
                <AverageBadge value={subject.average} />
              </View>
            ))
          )}
        </Card>

        <SectionHeader title={t("child.exams")} />
        <Card style={styles.list}>
          {exams.isPending ? (
            <LoadingState variant="spinner" />
          ) : !exams.data?.length ? (
            <AppText tone="secondary">{t("child.noExams")}</AppText>
          ) : (
            exams.data.slice(0, 6).map((exam) => (
              <Pressable
                key={exam.session_id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/review/[sessionId]", params: { sessionId: String(exam.session_id) } })}
                style={styles.row}
              >
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {exam.title}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {localize(exam.subject, language)}
                    {exam.submitted_at ? ` · ${formatRelative(exam.submitted_at, t)}` : ""}
                  </AppText>
                </View>
                <AppText variant="bodyStrong" tone="primary">
                  {t("exams.scoreOf", { score: exam.score, max: exam.max_score })}
                </AppText>
                <Icon name="chevronRight" size={14} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </Card>
      </Screen>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" tone="secondary" center numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

/** Month grid: green days fully attended, red days with an absence; absences listed below. */
function AttendanceMonth({ month, history }: { month: Date; history: AttendanceHistory }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const byDay = new Map<string, boolean>();
  for (const record of history.records) {
    byDay.set(record.date, (byDay.get(record.date) ?? true) && record.is_present);
  }
  const absences = history.records.filter((record) => !record.is_present);

  if (history.records.length === 0) {
    return <AppText tone="secondary">{t("child.noAttendance")}</AppText>;
  }

  return (
    <>
      <View style={styles.summary}>
        <SummaryPill color={colors.success} background={colors.successMuted} label={t("child.presentCount", { count: history.summary.present })} />
        <SummaryPill color={colors.danger} background={colors.dangerMuted} label={t("child.absentCount", { count: history.summary.absent })} />
        {history.summary.rate !== null ? (
          <SummaryPill color={colors.primary} background={colors.primaryMuted} label={t("child.attendanceRate", { rate: history.summary.rate })} />
        ) : null}
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((weekday) => (
          <AppText key={weekday} variant="caption" tone="muted" center style={styles.cell}>
            {weekdayName(weekday, t, true)}
          </AppText>
        ))}
      </View>
      {monthGrid(month).map((week) => (
        <View key={toISODate(week[0])} style={styles.week}>
          {week.map((day) => {
            const iso = toISODate(day);
            const status = byDay.get(iso);
            const inMonth = day.getMonth() === month.getMonth();
            return (
              <View
                key={iso}
                style={[
                  styles.cell,
                  styles.day,
                  status !== undefined && { backgroundColor: status ? colors.successMuted : colors.dangerMuted },
                ]}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: status === undefined ? colors.textMuted : status ? colors.success : colors.danger,
                    fontWeight: status === undefined ? "400" : "700",
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  {day.getDate()}
                </AppText>
              </View>
            );
          })}
        </View>
      ))}

      {absences.map((record) => (
        <View key={`${record.date}-${record.lesson_id}`} style={styles.row}>
          <AppText variant="caption" tone="secondary" style={styles.absenceDate}>
            {weekdayName(isoWeekday(new Date(`${record.date}T12:00:00`)), t, true)}, {formatDay(record.date, t)}
          </AppText>
          <View style={styles.flex}>
            <SubjectBadge subjectId={record.subject_id} label={localize(record.subject, language)} />
          </View>
          <AppText variant="caption" tone="danger">
            {record.start_time}
          </AppText>
        </View>
      ))}
    </>
  );
}

function SummaryPill({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <AppText variant="caption" style={{ color, fontWeight: "700" }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  profile: { gap: spacing.md },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingVertical: spacing.md, borderRadius: radius.md },
  attendance: { gap: spacing.sm },
  monthHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  week: { flexDirection: "row" },
  cell: { flex: 1 },
  day: { alignItems: "center", justifyContent: "center", height: 34, margin: 2, borderRadius: radius.sm },
  absenceDate: { width: 92 },
  list: { gap: spacing.md },
});
