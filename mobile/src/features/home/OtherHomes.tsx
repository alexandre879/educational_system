import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import type { Dashboard } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card, SectionHeader } from "@/components/Card";
import { QuickAction, QuickActionRow } from "@/components/QuickAction";
import { SubjectBadge } from "@/components/Subject";
import { useI18n } from "@/i18n";
import { localize } from "@/lib/localize";
import { fullName } from "@/lib/people";
import { radius, spacing, subjectColor, useTheme, withAlpha } from "@/theme";

import { AnnouncementRows, HeroStat, HeroStats, HomeHero, StatGrid, StatTile } from "./HomeParts";

export function TeacherHome({ data }: { data: Dashboard }) {
  const { t, language } = useI18n();
  const countBySubject = new Map((data.examCounts ?? []).map((entry) => [entry.subject_id, entry.count]));
  const subjects = data.subjectsTaught ?? [];
  const totalExams = (data.examCounts ?? []).reduce((sum, entry) => sum + entry.count, 0);

  return (
    <>
      <HomeHero me={data.me}>
        <HeroStats>
          <HeroStat value={subjects.length} label={t("home.subjectsTaught")} />
          <HeroStat value={totalExams} label={t("home.statsExams")} />
          <HeroStat value={(data.myAnnouncements ?? []).length} label={t("home.myAnnouncements")} />
        </HeroStats>
      </HomeHero>

      <QuickActionRow>
        <QuickAction icon="attendance" label={t("tabs.attendance")} color="#16A34A" onPress={() => router.push("/study")} />
        <QuickAction icon="gradebook" label={t("home.gradebook")} color="#22C55E" onPress={() => router.push("/more/gradebook")} />
        <QuickAction icon="exams" label={t("home.myExams")} color="#F97316" onPress={() => router.push("/more/exams")} />
        <QuickAction icon="calendar" label={t("home.calendar")} color="#06B6D4" onPress={() => router.push("/more/calendar")} />
      </QuickActionRow>
      <QuickActionRow>
        <QuickAction icon="exercises" label={t("exercises.title")} color="#1677FF" onPress={() => router.push("/exercises/new")} />
        <QuickAction icon="announcements" label={t("tabs.announcements")} color="#8B5CF6" onPress={() => router.push("/announcements/new")} />
        <QuickAction icon="search" label={t("home.search")} color="#64748B" onPress={() => router.push("/more/search")} />
        <QuickAction icon="assistant" label="AI" color="#EC4899" onPress={() => router.push("/more/assistant")} />
      </QuickActionRow>

      <SectionHeader title={t("home.subjectsTaught")} />
      {subjects.length === 0 ? (
        <Card>
          <AppText tone="secondary">{t("exercises.noSubjects")}</AppText>
        </Card>
      ) : (
        <View style={styles.subjectGrid}>
          {subjects.map((subject) => {
            const color = subjectColor(subject.id);
            return (
              <Card key={subject.id} style={[styles.subjectCard, { backgroundColor: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.25) }]}>
                <AppText variant="bodyStrong" numberOfLines={2} style={{ color }}>
                  {localize(subject.name, language)}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {[
                    subject.grade
                      ? `${t("common.grade")} ${subject.grade.name} ${localize(subject.grade.category_name, language)}`.trim()
                      : null,
                    t("home.examsCount", { count: countBySubject.get(subject.id) ?? 0 }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
              </Card>
            );
          })}
        </View>
      )}

      <SectionHeader
        title={t("home.myAnnouncements")}
        actionLabel={t("home.seeAll")}
        onAction={() => router.push("/announcements")}
      />
      <AnnouncementRows items={(data.myAnnouncements ?? []).slice(0, 4)} />
    </>
  );
}

export function AdminHome({ data }: { data: Dashboard }) {
  const { t } = useI18n();
  const stats = data.stats;

  return (
    <>
      <HomeHero me={data.me} />

      {stats ? (
        <StatGrid>
          <StatTile icon="person" label={t("home.statsUsers")} value={stats.users} color="#1677FF" />
          <StatTile icon="school" label={t("home.statsGrades")} value={stats.grades} color="#8B5CF6" />
          <StatTile icon="exercises" label={t("home.statsSubjects")} value={stats.subjects} color="#14B8A6" />
          <StatTile icon="exams" label={t("home.statsExams")} value={stats.exams} color="#F97316" />
          <StatTile icon="comment" label={t("home.statsQuestions")} value={stats.questions} color="#EC4899" />
        </StatGrid>
      ) : null}

      <SectionHeader
        title={t("home.latestAnnouncements")}
        actionLabel={t("home.seeAll")}
        onAction={() => router.push("/announcements")}
      />
      <AnnouncementRows items={(data.latestAnnouncements ?? []).slice(0, 5)} />
    </>
  );
}

export function ParentHome({ data }: { data: Dashboard }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const children = data.children ?? [];

  return (
    <>
      <HomeHero me={data.me} />

      <QuickActionRow>
        <QuickAction icon="calendar" label={t("home.calendar")} color="#1677FF" onPress={() => router.push("/more/calendar")} />
        <QuickAction icon="marks" label={t("home.marks")} color="#22C55E" onPress={() => router.push("/more/marks")} />
        <QuickAction icon="search" label={t("home.search")} color="#64748B" onPress={() => router.push("/more/search")} />
        <QuickAction icon="assistant" label="AI" color="#EC4899" onPress={() => router.push("/more/assistant")} />
      </QuickActionRow>

      <SectionHeader title={t("home.children")} />
      {children.length === 0 ? (
        <Card>
          <AppText tone="secondary">{t("home.noChildren")}</AppText>
        </Card>
      ) : (
        children.map((child) => {
          const name = fullName(child);
          const grade = child.grade
            ? `${child.grade.name} ${localize(child.grade.category_name, language)}`.trim()
            : t("common.noGrade");

          return (
            <Card
              key={child.id}
              style={styles.childCard}
              accessibilityLabel={name}
              onPress={() => router.push({ pathname: "/child/[id]", params: { id: String(child.id) } })}
            >
              <View style={styles.childHeader}>
                <Avatar uri={child.profilePic} name={name} size={52} />
                <View style={styles.flex}>
                  <AppText variant="subheading">{name}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {t("common.grade")} {grade}
                  </AppText>
                </View>
                <View style={[styles.pointsPill, { backgroundColor: colors.warningMuted }]}>
                  <AppText variant="bodyStrong" style={{ color: colors.warning }}>
                    ★ {child.points}
                  </AppText>
                </View>
              </View>

              <View style={styles.childStats}>
                <ChildStat label={t("home.averageMark")} value={child.average_mark === null ? "—" : child.average_mark.toFixed(1)} />
                <ChildStat label={t("home.attendanceRate")} value={child.attendance_rate === null ? "—" : `${child.attendance_rate}%`} />
                <ChildStat label={t("home.pendingHomework")} value={String(child.pending_homework)} />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <AppText variant="label" tone="secondary">
                {t("home.attendanceToday")}
              </AppText>
              {child.attendance_today.length === 0 ? (
                <AppText variant="caption" tone="muted">
                  {t("home.noAttendanceToday")}
                </AppText>
              ) : (
                <View style={styles.attendanceList}>
                  {child.attendance_today.map((record) => (
                    <View key={record.lesson_id} style={styles.attendanceRow}>
                      <AppText variant="caption" tone="secondary" style={styles.time}>
                        {record.start_time}
                      </AppText>
                      <View style={styles.flex}>
                        <SubjectBadge subjectId={record.subject_id} label={localize(record.subject, language)} />
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: record.is_present ? colors.successMuted : colors.dangerMuted },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: record.is_present ? colors.success : colors.danger, fontWeight: "700" }}
                        >
                          {record.is_present ? t("home.present") : t("home.absent")}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })
      )}
    </>
  );
}

function ChildStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.childStat, { backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="subheading">{value}</AppText>
      <AppText variant="caption" tone="secondary" center numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  childStats: { flexDirection: "row", gap: spacing.sm },
  childStat: { flex: 1, alignItems: "center", gap: 2, paddingVertical: spacing.sm, borderRadius: radius.md },
  subjectGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  subjectCard: { flexGrow: 1, flexBasis: "45%", padding: spacing.md, gap: 4 },
  childCard: { gap: spacing.md },
  childHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  pointsPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  divider: { height: StyleSheet.hairlineWidth },
  attendanceList: { gap: spacing.sm },
  attendanceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  time: { width: 44 },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
});
