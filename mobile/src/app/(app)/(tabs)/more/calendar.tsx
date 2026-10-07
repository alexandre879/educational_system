import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchCalendar } from "@/api/endpoints";
import type { CalendarExam, CalendarHomework, CalendarLesson } from "@/api/types";
import { useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Card, SectionHeader } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/States";
import { SubjectBadge } from "@/components/Subject";
import { ChildPicker, useSelectedChild } from "@/features/people/ChildPicker";
import { useI18n } from "@/i18n";
import {
  addMonths,
  formatDay,
  formatMonth,
  isoWeekday,
  monthGrid,
  toISODate,
  weekdayName,
  type IsoWeekday,
} from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, subjectColor, useTheme } from "@/theme";

const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

function groupBy<T>(items: T[], key: (item: T) => string | number): Map<string | number, T[]> {
  const groups = new Map<string | number, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}

/** Month view of lessons, homework due dates and scheduled exams, with the chosen day's agenda. */
export default function CalendarScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const user = useCurrentUser();
  const [chosenChild, setChosenChild] = useState<number | undefined>();
  const studentId = useSelectedChild(chosenChild);

  const today = toISODate(new Date());
  const [month, setMonth] = useState(() => addMonths(new Date(), 0));
  const [selected, setSelected] = useState(today);

  const weeks = monthGrid(month);
  const start = toISODate(weeks[0][0]);
  const end = toISODate(weeks[weeks.length - 1][6]);

  const { data, error, isRefetching, refetch } = useQuery({
    queryKey: ["calendar", start, end, studentId ?? "me"],
    queryFn: () => fetchCalendar(start, end, studentId),
    placeholderData: keepPreviousData,
  });

  const lessonsByWeekday = groupBy(data?.lessons ?? [], (lesson) => lesson.weekday);
  const homeworkByDay = groupBy(data?.homework ?? [], (item) => item.due_date);
  const examsByDay = groupBy(data?.exams ?? [], (exam) => exam.scheduled_for);

  const selectedDate = new Date(`${selected}T12:00:00`);
  const dayLessons = (lessonsByWeekday.get(isoWeekday(selectedDate)) ?? []) as CalendarLesson[];
  const dayHomework = (homeworkByDay.get(selected) ?? []) as CalendarHomework[];
  const dayExams = (examsByDay.get(selected) ?? []) as CalendarExam[];

  const goToMonth = (offset: number) => setMonth((current) => addMonths(current, offset));
  const goToday = () => {
    setMonth(addMonths(new Date(), 0));
    setSelected(today);
  };

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <ChildPicker value={studentId} onChange={setChosenChild} />

      <Card style={styles.calendar}>
        <View style={styles.monthHeader}>
          <Pressable accessibilityRole="button" onPress={() => goToMonth(-1)} hitSlop={10} style={styles.arrow}>
            <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goToday} style={styles.flex}>
            <AppText variant="subheading" center>
              {formatMonth(month, t)}
            </AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => goToMonth(1)} hitSlop={10} style={styles.arrow}>
            <Icon name="chevronRight" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.week}>
          {WEEKDAYS.map((weekday) => (
            <AppText key={weekday} variant="caption" tone="muted" center style={styles.cell}>
              {weekdayName(weekday, t, true)}
            </AppText>
          ))}
        </View>

        {weeks.map((week) => (
          <View key={toISODate(week[0])} style={styles.week}>
            {week.map((day) => {
              const iso = toISODate(day);
              const inMonth = day.getMonth() === month.getMonth();
              const isSelected = iso === selected;
              const isToday = iso === today;
              const hasLessons = lessonsByWeekday.has(isoWeekday(day));
              const hasHomework = homeworkByDay.has(iso);
              const hasExam = examsByDay.has(iso);

              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(iso)}
                  style={[
                    styles.cell,
                    styles.day,
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                  ]}
                >
                  <AppText
                    variant="bodyStrong"
                    style={{
                      color: isSelected ? colors.onPrimary : inMonth ? colors.text : colors.textMuted,
                      opacity: inMonth ? 1 : 0.6,
                    }}
                  >
                    {day.getDate()}
                  </AppText>
                  <View style={styles.dots}>
                    {hasExam ? <Dot color={isSelected ? colors.onPrimary : colors.accent} /> : null}
                    {hasHomework ? <Dot color={isSelected ? colors.onPrimary : colors.warning} /> : null}
                    {!hasExam && !hasHomework && hasLessons && inMonth ? (
                      <Dot color={isSelected ? colors.onPrimary : colors.border} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={styles.legend}>
          <Legend color={colors.accent} label={t("calendar.exams")} />
          <Legend color={colors.warning} label={t("calendar.homework")} />
        </View>
      </Card>

      {error && !data ? <ErrorState error={error} onRetry={refetch} /> : null}

      <AppText variant="heading">
        {selected === today ? t("common.today") : weekdayName(isoWeekday(selectedDate), t)}, {formatDay(selected, t)}
      </AppText>

      {dayExams.length === 0 && dayHomework.length === 0 && dayLessons.length === 0 ? (
        <Card>
          <AppText tone="secondary">{t("calendar.nothing")}</AppText>
        </Card>
      ) : null}

      {dayExams.length ? (
        <>
          <SectionHeader title={t("calendar.exams")} />
          {dayExams.map((exam) => (
            <Card
              key={exam.id}
              onPress={() => router.push(user.role === "teacher" ? "/more/exams" : "/study")}
              style={[styles.agendaCard, { borderLeftColor: colors.accent }]}
            >
              <SubjectBadge subjectId={exam.subject_id} label={localize(exam.subject, language)} />
              <AppText variant="bodyStrong">{localize(exam.title, language)}</AppText>
              <AppText variant="caption" tone="secondary">
                {t("common.minutes", { count: exam.duration })}
              </AppText>
            </Card>
          ))}
        </>
      ) : null}

      {dayHomework.length ? (
        <>
          <SectionHeader title={t("calendar.homework")} />
          {dayHomework.map((item) => (
            <Card
              key={item.id}
              onPress={() => router.push({ pathname: "/exercises", params: { date: item.date } })}
              style={[styles.agendaRow, { borderLeftColor: item.completed ? colors.success : colors.warning }]}
            >
              <Icon
                name={item.completed ? "check" : "exercises"}
                size={20}
                color={item.completed ? colors.success : colors.warning}
              />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={2}>
                  {item.title}
                </AppText>
                {item.subject ? (
                  <AppText variant="caption" tone="secondary">
                    {localize(item.subject, language)}
                  </AppText>
                ) : null}
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {dayLessons.length ? (
        <>
          <SectionHeader title={t("calendar.lessons")} />
          <Card style={styles.lessons}>
            {dayLessons.map((lesson, index) => (
              <View
                key={lesson.id}
                style={[styles.lesson, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <AppText variant="caption" tone="secondary" style={styles.time}>
                  {lesson.start_time}
                </AppText>
                <View style={[styles.lessonBar, { backgroundColor: subjectColor(lesson.subject_id) }]} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {localize(lesson.subject, language)}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {[
                      `${lesson.start_time}–${lesson.end_time}`,
                      lesson.room ? t("schedule.room", { room: lesson.room }) : null,
                      user.role === "teacher" ? `${t("common.grade")} ${lesson.grade}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <Dot color={color} />
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  calendar: { gap: spacing.xs, paddingHorizontal: spacing.sm },
  monthHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  arrow: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  week: { flexDirection: "row" },
  cell: { flex: 1 },
  day: { alignItems: "center", justifyContent: "center", height: 46, margin: 2, borderRadius: radius.sm, gap: 3 },
  dots: { flexDirection: "row", gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: "row", justifyContent: "center", gap: spacing.lg, marginTop: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  agendaCard: { borderLeftWidth: 4, gap: 6 },
  agendaRow: { borderLeftWidth: 4, flexDirection: "row", alignItems: "center", gap: spacing.md },
  lessons: { paddingVertical: spacing.xs, gap: 0 },
  lesson: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  time: { width: 42 },
  lessonBar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
});
