import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchSchedule } from "@/api/endpoints";
import type { Announcement, Me } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Glass } from "@/components/Glass";
import { Hero } from "@/components/Hero";
import { Icon, type IconName } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { SubjectMark } from "@/components/Subject";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { useI18n } from "@/i18n";
import { formatDay, formatRelative, greetingKey, isoWeekday, weekdayName } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { fullName } from "@/lib/people";
import { radius, spacing, subjectColor, useTheme, withAlpha } from "@/theme";

/** Gradient header: greeting, today's date, avatar, role/grade chips and optional extra content. */
export function HomeHero({ me, children, badges }: { me: Me; children?: ReactNode; badges?: ReactNode }) {
  const { t, language } = useI18n();
  const name = fullName(me);
  const today = new Date();
  const grade = me.grade_in
    ? `${me.grade_in.name} ${localize(me.grade_in.category?.name, language)}`.trim()
    : null;

  return (
    <Hero>
      <View style={styles.heroTop}>
        <View style={styles.flex}>
          <AppText variant="caption" style={styles.heroMuted}>
            {weekdayName(isoWeekday(today), t)}, {formatDay(today, t)}
          </AppText>
          <AppText variant="title" style={styles.heroText} numberOfLines={2}>
            {t(greetingKey(today), { name: me.first_name || name })}
          </AppText>
        </View>
        <View style={styles.avatarRing}>
          <Avatar uri={me.profilePic} name={name} size={52} />
        </View>
      </View>
      <View style={styles.chipsRow}>
        <View style={styles.chips}>
          {me.role ? <HeroChip label={t(`roles.${me.role}`)} /> : null}
          {grade ? <HeroChip label={`${t("common.grade")} ${grade}`} /> : null}
          {badges}
        </View>
        <NotificationBell />
      </View>
      {children}
    </Hero>
  );
}

export function HeroChip({ label }: { label: string }) {
  return (
    <Glass
      radius={radius.pill}
      variant="clear"
      tint="rgba(255, 255, 255, 0.14)"
      style={styles.heroChip}
      fallbackStyle={styles.heroGlassFallback}
    >
      <AppText variant="caption" style={styles.heroChipText}>
        {label}
      </AppText>
    </Glass>
  );
}

/** A number with its label on a small pane of glass over the hero's gradient. */
export function HeroStat({ value, label }: { value: number | string; label: string }) {
  return (
    <Glass
      radius={radius.md}
      variant="clear"
      tint="rgba(255, 255, 255, 0.1)"
      style={styles.heroStat}
      fallbackStyle={styles.heroGlassFallback}
    >
      <AppText variant="heading" style={styles.heroText}>
        {value}
      </AppText>
      <AppText variant="caption" style={styles.heroMuted} numberOfLines={2}>
        {label}
      </AppText>
    </Glass>
  );
}

export function HeroStats({ children }: { children: ReactNode }) {
  return <View style={styles.heroStats}>{children}</View>;
}

export function StatTile({ icon, label, value, color }: { icon: IconName; label: string; value: number | string; color: string }) {
  return (
    <Card style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
    </Card>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Today's lessons as a timeline; the one happening right now is highlighted. */
export function TodayLessons() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const now = new Date();
  const weekday = isoWeekday(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const { data, isPending, isError } = useQuery({
    queryKey: ["schedule", weekday],
    queryFn: () => fetchSchedule(weekday),
  });

  if (isPending) {
    return (
      <Card>
        <Skeleton width="50%" height={16} />
        <Skeleton height={44} rounded={12} />
        <Skeleton height={44} rounded={12} />
      </Card>
    );
  }
  if (isError) return null;

  if (data.lessons.length === 0) {
    return (
      <Card style={styles.emptyLessons}>
        <AppText tone="secondary">{t("home.noLessonsToday")}</AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.timeline}>
      {data.lessons.map((lesson, index) => {
        const current = nowMinutes >= toMinutes(lesson.start_time) && nowMinutes < toMinutes(lesson.end_time);
        const past = nowMinutes >= toMinutes(lesson.end_time);
        const color = subjectColor(lesson.subject.id);
        const name = localize(lesson.subject.name, language);
        const last = index === data.lessons.length - 1;

        return (
          <View key={lesson.id} style={[styles.lessonRow, past && styles.past]}>
            <View style={styles.lessonTime}>
              <AppText variant="bodyStrong">{lesson.start_time}</AppText>
              <AppText variant="caption" tone="muted">
                {lesson.end_time}
              </AppText>
            </View>
            <View style={styles.rail}>
              <View style={[styles.railDot, { backgroundColor: color, borderColor: withAlpha(color, 0.3) }]} />
              {!last ? <View style={[styles.railLine, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View
              style={[
                styles.lessonCard,
                { backgroundColor: withAlpha(color, current ? 0.16 : 0.08), borderColor: current ? color : "transparent" },
              ]}
            >
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {name}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {[lesson.teacher.name, lesson.room ? t("schedule.room", { room: lesson.room }) : null]
                    .filter(Boolean)
                    .join(" · ") || t("schedule.teacherNotSet")}
                </AppText>
              </View>
              {current ? (
                <View style={[styles.nowPill, { backgroundColor: color }]}>
                  <AppText variant="caption" style={styles.nowText}>
                    {t("home.now")}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/** Compact announcement rows for the home screen. */
export function AnnouncementRows({ items }: { items: Announcement[] }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  if (items.length === 0) {
    return (
      <Card>
        <AppText tone="secondary">{t("home.noAnnouncements")}</AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.rowsCard}>
      {items.map((item, index) => {
        const subject = item.subject ? localize(item.subject.name, language) : item.title;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/announcements/[id]", params: { id: String(item.id) } })}
            style={({ pressed }) => [
              styles.announcementRow,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <SubjectMark subjectId={item.subject?.id} label={subject} size={40} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {item.content}
              </AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {formatRelative(item.created_at, t)}
            </AppText>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  heroText: { color: "#FFFFFF" },
  heroMuted: { color: "rgba(255, 255, 255, 0.8)" },
  avatarRing: { padding: 3, borderRadius: 999, backgroundColor: "rgba(255, 255, 255, 0.35)" },
  chipsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  heroChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  heroChipText: { color: "#FFFFFF", fontWeight: "700" },
  // Translucent white where native Liquid Glass isn't available.
  heroGlassFallback: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroStat: { flex: 1, gap: 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { flexGrow: 1, flexBasis: "30%", gap: 6, padding: spacing.md },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyLessons: { alignItems: "center", paddingVertical: spacing.xl },
  timeline: { gap: 0, paddingVertical: spacing.md },
  lessonRow: { flexDirection: "row", alignItems: "stretch", gap: spacing.sm, minHeight: 66 },
  past: { opacity: 0.5 },
  lessonTime: { width: 48, paddingTop: spacing.sm },
  rail: { width: 14, alignItems: "center" },
  railDot: { width: 12, height: 12, borderRadius: 6, marginTop: spacing.md, borderWidth: 3 },
  railLine: { flex: 1, width: 2, marginTop: 2 },
  lessonCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  nowPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  nowText: { color: "#FFFFFF", fontWeight: "800" },
  rowsCard: { paddingVertical: spacing.xs, gap: 0 },
  announcementRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
});
