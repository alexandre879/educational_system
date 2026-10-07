import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { Dashboard } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card, SectionHeader } from "@/components/Card";
import { Badge, ProgressBar } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { QuickAction, QuickActionRow } from "@/components/QuickAction";
import { SubjectMark } from "@/components/Subject";
import { useI18n } from "@/i18n";
import { formatRelative, formatTime } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { spacing, subjectColor, useTheme, withAlpha } from "@/theme";

import { AnnouncementRows, HeroChip, HeroStat, HeroStats, HomeHero, TodayLessons } from "./HomeParts";

export function StudentHome({ data }: { data: Dashboard }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const sessions = data.sessions ?? [];
  // Captured once per mount; pull-to-refresh refetches the sessions themselves.
  const [now] = useState(() => Date.now());

  const activeSessions = sessions.filter(
    (s) => s.is_active && !s.finished && s.ends_at && new Date(s.ends_at).getTime() > now
  );
  const recentSessions = sessions.filter((s) => !activeSessions.includes(s)).slice(0, 4);

  const subjectPoints = (data.subjectPoints ?? [])
    .map((entry) => ({ id: entry.subject.id, name: localize(entry.subject.name, language), points: entry.points ?? 0 }))
    .sort((a, b) => b.points - a.points);
  const maxPoints = Math.max(1, ...subjectPoints.map((entry) => entry.points));

  return (
    <>
      <HomeHero
        me={data.me}
        badges={data.streak ? <HeroChip label={`🔥 ${t("home.streak", { count: data.streak })}`} /> : null}
      >
        <HeroStats>
          <HeroStat
            value={data.average_mark == null ? "—" : data.average_mark.toFixed(1)}
            label={t("home.averageMark")}
          />
          <HeroStat value={data.pending_homework ?? 0} label={t("home.pendingHomework")} />
          <HeroStat value={data.me.points ?? 0} label={t("home.totalPoints")} />
        </HeroStats>
      </HomeHero>

      <QuickActionRow>
        <QuickAction icon="calendar" label={t("home.calendar")} color="#1677FF" onPress={() => router.push("/more/calendar")} />
        <QuickAction icon="marks" label={t("home.marks")} color="#22C55E" onPress={() => router.push("/more/marks")} />
        <QuickAction
          icon="results"
          label={t("home.results")}
          color="#F97316"
          onPress={() => router.push({ pathname: "/study", params: { tab: "results" } })}
        />
        <QuickAction icon="schedule" label={t("schedule.title")} color="#06B6D4" onPress={() => router.push("/more/schedule")} />
      </QuickActionRow>
      <QuickActionRow>
        <QuickAction icon="books" label={t("books.title")} color="#8B5CF6" onPress={() => router.push("/more/books")} />
        <QuickAction icon="leaderboard" label={t("home.ranking")} color="#F59E0B" onPress={() => router.push("/more/leaderboard")} />
        <QuickAction icon="search" label={t("home.search")} color="#64748B" onPress={() => router.push("/more/search")} />
        <QuickAction icon="assistant" label="AI" color="#EC4899" onPress={() => router.push("/more/assistant")} />
      </QuickActionRow>

      {activeSessions.map((session) => (
        <Card key={session.id} style={[styles.activeExam, { borderColor: colors.warning }]}>
          <View style={styles.row}>
            <View style={[styles.timerIcon, { backgroundColor: colors.warningMuted }]}>
              <Icon name="timer" size={22} color={colors.warning} />
            </View>
            <View style={styles.flex}>
              <AppText variant="subheading" numberOfLines={1}>
                {localize(session.exam.title, language)}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {localize(session.subject.name, language)} · {t("home.endsAt", { time: formatTime(session.ends_at!) })}
              </AppText>
            </View>
          </View>
          <Button
            title={t("home.continueExam")}
            variant="gradient"
            onPress={() => router.push({ pathname: "/exam/[id]", params: { id: String(session.exam.id) } })}
          />
        </Card>
      ))}

      <SectionHeader title={t("home.todayLessons")} actionLabel={t("home.seeAll")} onAction={() => router.push("/more/schedule")} />
      <TodayLessons />

      <SectionHeader title={t("home.pointsBySubject")} />
      <Card style={styles.pointsCard}>
        {subjectPoints.length === 0 ? (
          <AppText tone="secondary">{t("home.noPointsYet")}</AppText>
        ) : (
          subjectPoints.map((entry) => (
            <View key={entry.id} style={styles.pointsRow}>
              <SubjectMark subjectId={entry.id} label={entry.name} size={36} />
              <View style={styles.flex}>
                <View style={styles.pointsLabel}>
                  <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                    {entry.name}
                  </AppText>
                  <AppText variant="bodyStrong" style={{ color: subjectColor(entry.id) }}>
                    {entry.points}
                  </AppText>
                </View>
                <ProgressBar progress={entry.points / maxPoints} color={subjectColor(entry.id)} />
              </View>
            </View>
          ))
        )}
      </Card>

      <SectionHeader
        title={t("home.latestAnnouncements")}
        actionLabel={t("home.seeAll")}
        onAction={() => router.push("/announcements")}
      />
      <AnnouncementRows items={(data.announcements ?? []).slice(0, 3)} />

      <SectionHeader title={t("home.recentExams")} />
      <Card style={styles.rowsCard}>
        {recentSessions.length === 0 ? (
          <AppText tone="secondary">{t("home.noSessionsYet")}</AppText>
        ) : (
          recentSessions.map((session, index) => (
            <View
              key={session.id}
              style={[styles.sessionRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <View style={[styles.scoreBubble, { backgroundColor: withAlpha(subjectColor(session.subject.id), 0.14) }]}>
                <AppText variant="bodyStrong" style={{ color: subjectColor(session.subject.id) }}>
                  {session.score_so_far}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {localize(session.exam.title, language)}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {localize(session.subject.name, language)}
                  {session.started_at ? ` · ${formatRelative(session.started_at, t)}` : ""}
                </AppText>
              </View>
              <Badge
                label={session.finished ? t("home.finished") : t("home.inProgress")}
                tone={session.finished ? "success" : "neutral"}
              />
            </View>
          ))
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  activeExam: { borderWidth: 1.5, gap: spacing.md },
  timerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pointsCard: { gap: spacing.md },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  pointsLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
  rowsCard: { paddingVertical: spacing.xs, gap: 0 },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  scoreBubble: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
