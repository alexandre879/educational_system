import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { SessionMini } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useI18n } from "@/i18n";
import { formatDay, formatTime, toISODate } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { mtavruli } from "@/lib/mtavruli";
import { radius, spacing, subjectColor, useTheme, withAlpha } from "@/theme";

/** Ticks every second while `active`, so countdowns stay live. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function formatLeft(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Exams running right now: a LIVE card with a countdown and a way back in. Nothing when there are none. */
export function LiveExams({ sessions }: { sessions: SessionMini[] }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const now = useNow(sessions.length > 0);
  const live = sessions.filter((s) => s.ends_at && new Date(s.ends_at).getTime() > now);

  return (
    <>
      {live.map((session) => {
        const left = new Date(session.ends_at as string).getTime() - now;
        const total = (session.exam.duration || 0) * 60_000;
        const progress = total ? Math.min(1, Math.max(0, 1 - left / total)) : 0;
        return (
          <Card key={session.id} style={[styles.live, { borderColor: colors.warning }]}>
            <View style={styles.row}>
              <View style={[styles.livePill, { backgroundColor: colors.warningMuted }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.warning }]} />
                <AppText variant="caption" style={[styles.livePillText, { color: colors.warning }]}>
                  {t("home.live")}
                </AppText>
              </View>
              <AppText variant="bodyStrong" style={styles.liveClock} accessibilityRole="timer">
                {t("home.timeLeft", { time: formatLeft(left) })}
              </AppText>
            </View>
            <View>
              <AppText variant="subheading" numberOfLines={1}>
                {localize(session.exam.title, language)}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {localize(session.subject.name, language)}
              </AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.trackFill, { width: `${progress * 100}%`, backgroundColor: colors.warning }]} />
            </View>
            <Button
              title={t("home.continueExam")}
              variant="gradient"
              onPress={() => router.push({ pathname: "/exam/[id]", params: { id: String(session.exam.id) } })}
            />
          </Card>
        );
      })}
    </>
  );
}

/** Recent exams on a timeline grouped by day; finished ones open their answer review. */
export function ExamTimeline({ sessions }: { sessions: SessionMini[] }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  // Read once per mount, not during every render.
  const now = useNow(false);

  if (sessions.length === 0) {
    return (
      <Card>
        <AppText tone="secondary">{t("home.noSessionsYet")}</AppText>
      </Card>
    );
  }

  const today = toISODate(new Date(now));
  const yesterday = toISODate(new Date(now - 86_400_000));
  const groups: { key: string; label: string; items: SessionMini[] }[] = [];
  for (const session of sessions) {
    const date = session.started_at ? new Date(session.started_at) : null;
    const key = date ? toISODate(date) : "unknown";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label = !date ? "—" : key === today ? t("common.today") : key === yesterday ? t("time.yesterday") : formatDay(date, t);
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(session);
  }

  return (
    <Card style={styles.timelineCard}>
      {groups.map((group) => (
        <View key={group.key} style={styles.day}>
          <AppText variant="caption" tone="muted" style={styles.dayLabel}>
            {mtavruli(group.label.toUpperCase())}
          </AppText>
          <View>
            {/* The line runs through every dot of the day. */}
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            {group.items.map((session) => {
              const color = subjectColor(session.subject.id);
              const max = session.max_score ?? 0;
              const ratio = max ? Math.min(1, Math.max(0, session.score_so_far / max)) : 0;
              const title = localize(session.exam.title, language);
              return (
                <Pressable
                  key={session.id}
                  disabled={!session.finished}
                  accessibilityRole={session.finished ? "button" : undefined}
                  accessibilityLabel={`${title}, ${session.score_so_far}${max ? ` / ${max}` : ""}`}
                  onPress={() => router.push({ pathname: "/review/[sessionId]", params: { sessionId: String(session.id) } })}
                  style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceMuted }]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: color, borderColor: colors.surface, boxShadow: `0px 0px 10px ${withAlpha(color, 0.6)}` },
                    ]}
                  />
                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                        {title}
                      </AppText>
                      <AppText variant="bodyStrong" style={styles.score}>
                        {session.score_so_far}
                        {max ? <AppText tone="muted">{` / ${max}`}</AppText> : null}
                      </AppText>
                    </View>
                    <View style={styles.meta}>
                      <View style={[styles.subject, { backgroundColor: withAlpha(color, 0.16) }]}>
                        <AppText variant="caption" numberOfLines={1} style={styles.subjectText}>
                          {localize(session.subject.name, language)}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="secondary">
                        {session.finished ? t("home.finished") : t("home.inProgress")}
                        {session.started_at ? ` · ${formatTime(session.started_at)}` : ""}
                      </AppText>
                    </View>
                    {max ? (
                      <View style={[styles.bar, { backgroundColor: colors.surfaceMuted }]}>
                        <LinearGradient
                          colors={[withAlpha(colors.primary, 0.7), colors.primary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.barFill, { width: `${ratio * 100}%` }]}
                        />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  live: { borderWidth: 1.5, gap: spacing.md },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  livePillText: { fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  liveClock: { fontVariant: ["tabular-nums"] },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 2 },
  timelineCard: { paddingVertical: spacing.sm, gap: spacing.sm },
  day: { gap: 2 },
  dayLabel: { marginLeft: 30, fontWeight: "800", letterSpacing: 1 },
  line: { position: "absolute", top: 18, bottom: 18, left: 8, width: 2, borderRadius: 1 },
  item: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm, paddingRight: spacing.xs, borderRadius: radius.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginTop: 3, marginLeft: 2 },
  itemBody: { flex: 1, gap: 6 },
  itemTop: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  score: { fontVariant: ["tabular-nums"] },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  subject: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, maxWidth: "60%" },
  subjectText: { fontWeight: "600" },
  bar: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
});
