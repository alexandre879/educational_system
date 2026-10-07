import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { errorStatus } from "@/api/client";
import { fetchSchedule } from "@/api/endpoints";
import { AppText } from "@/components/AppText";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useI18n } from "@/i18n";
import { isoWeekday, weekdayName, type IsoWeekday } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, subjectColor, useTheme, withAlpha } from "@/theme";

const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function ScheduleView() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const now = new Date();
  const today = isoWeekday(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [weekday, setWeekday] = useState<IsoWeekday>(today);

  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["schedule", weekday],
    queryFn: () => fetchSchedule(weekday),
  });

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <View style={[styles.days, { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.shadow }]}>
        {WEEKDAYS.map((day) => {
          const selected = day === weekday;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                setWeekday(day);
              }}
              style={[styles.day, selected && { backgroundColor: colors.primary }]}
            >
              <AppText variant="caption" style={{ color: selected ? colors.onPrimary : colors.textSecondary, fontWeight: "700" }}>
                {weekdayName(day, t, true)}
              </AppText>
              <View style={[styles.todayDot, { backgroundColor: day === today ? (selected ? colors.onPrimary : colors.primary) : "transparent" }]} />
            </Pressable>
          );
        })}
      </View>

      <AppText variant="heading">{weekdayName(weekday, t)}</AppText>

      {isPending ? (
        <LoadingState />
      ) : errorStatus(error) === 400 ? (
        <EmptyState icon="schedule" title={t("schedule.noChildGrade")} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.lessons.length === 0 ? (
        <EmptyState icon="schedule" title={t("schedule.empty")} />
      ) : (
        <View>
          {data.lessons.map((lesson, index) => {
            const color = subjectColor(lesson.subject.id);
            const current =
              weekday === today && nowMinutes >= toMinutes(lesson.start_time) && nowMinutes < toMinutes(lesson.end_time);
            const last = index === data.lessons.length - 1;

            return (
              <View key={lesson.id} style={styles.row}>
                <View style={styles.time}>
                  <AppText variant="bodyStrong">{lesson.start_time}</AppText>
                  <AppText variant="caption" tone="muted">
                    {lesson.end_time}
                  </AppText>
                </View>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: color, borderColor: withAlpha(color, 0.3) }]} />
                  {!last ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
                </View>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: current ? color : colors.border,
                      borderWidth: current ? 1.5 : StyleSheet.hairlineWidth,
                      boxShadow: colors.shadow,
                    },
                  ]}
                >
                  <View style={[styles.cardAccent, { backgroundColor: color }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.titleRow}>
                      <AppText variant="subheading" numberOfLines={1} style={styles.flex}>
                        {localize(lesson.subject.name, language)}
                      </AppText>
                      {current ? (
                        <View style={[styles.nowPill, { backgroundColor: color }]}>
                          <AppText variant="caption" style={styles.nowText}>
                            {t("home.now")}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.meta}>
                      <Icon name="person" size={13} color={colors.textMuted} />
                      <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
                        {lesson.teacher.name || t("schedule.teacherNotSet")}
                      </AppText>
                    </View>
                    {lesson.room ? (
                      <View style={styles.meta}>
                        <Icon name="location" size={13} color={colors.textMuted} />
                        <AppText variant="caption" tone="secondary">
                          {t("schedule.room", { room: lesson.room })}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  days: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  day: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.md, gap: 3 },
  todayDot: { width: 5, height: 5, borderRadius: 3 },
  row: { flexDirection: "row", gap: spacing.sm },
  time: { width: 50, paddingTop: spacing.md },
  rail: { width: 14, alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, marginTop: spacing.lg },
  line: { flex: 1, width: 2, marginTop: 2 },
  card: { flex: 1, flexDirection: "row", borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.md },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  nowPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  nowText: { color: "#FFFFFF", fontWeight: "800" },
});
