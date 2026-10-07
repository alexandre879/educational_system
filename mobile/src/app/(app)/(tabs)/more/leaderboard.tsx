import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { fetchLeaderboard, fetchMySubjects } from "@/api/endpoints";
import type { LeaderboardEntry } from "@/api/types";
import { useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Chip, ChipRow } from "@/components/Controls";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useI18n } from "@/i18n";
import { localize } from "@/lib/localize";
import { fullName } from "@/lib/people";
import { radius, spacing, useTheme, withAlpha } from "@/theme";

const MEDAL_COLORS = ["#F5B700", "#A0AEC0", "#CD7F32"];

export default function LeaderboardScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const user = useCurrentUser();

  const subjects = useQuery({ queryKey: ["mySubjects"], queryFn: fetchMySubjects });
  const [chosenId, setChosenId] = useState<number | null>(null);

  // Subjects without a grade category can't be ranked by the API.
  const rankable = (subjects.data ?? []).filter((s) => s.grade__category__pk !== null);
  const subject = rankable.find((s) => s.pk === chosenId) ?? rankable[0];

  const board = useQuery({
    queryKey: ["leaderboard", subject?.pk],
    queryFn: () => fetchLeaderboard(subject!),
    enabled: !!subject,
  });

  const refresh = () => {
    void subjects.refetch();
    if (subject) void board.refetch();
  };

  const entries = board.data ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <Screen onRefresh={refresh} refreshing={subjects.isRefetching || board.isRefetching}>
      {subjects.isPending ? (
        <LoadingState />
      ) : subjects.error ? (
        <ErrorState error={subjects.error} onRetry={subjects.refetch} />
      ) : !subject ? (
        <EmptyState icon="leaderboard" title={t("leaderboard.noSubjects")} />
      ) : (
        <>
          <ChipRow>
            {rankable.map((s) => (
              <Chip
                key={s.pk}
                label={`${localize(s.name, language)} · ${s.grade__name}`}
                selected={s.pk === subject.pk}
                onPress={() => setChosenId(s.pk)}
              />
            ))}
          </ChipRow>

          {board.isPending ? (
            <LoadingState />
          ) : board.error ? (
            <ErrorState error={board.error} onRetry={board.refetch} />
          ) : entries.length === 0 ? (
            <EmptyState icon="leaderboard" title={t("leaderboard.empty")} />
          ) : (
            <>
              <Podium entries={podium} myEmail={user.email} />
              {rest.map((entry, index) => {
                const isMe = entry.email === user.email;
                return (
                  <Card
                    key={entry.email}
                    style={[styles.row, isMe && { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}
                  >
                    <AppText variant="bodyStrong" tone="muted" style={styles.rank}>
                      {index + 4}
                    </AppText>
                    <Avatar uri={entry.profile_pic} name={fullName(entry)} size={40} />
                    <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                      {fullName(entry)}
                      {isMe ? ` · ${t("leaderboard.you")}` : ""}
                    </AppText>
                    <AppText variant="subheading" tone="primary">
                      {entry.points}
                    </AppText>
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

/** Top three as a podium: 2nd · 1st · 3rd, with the winner raised. */
function Podium({ entries, myEmail }: { entries: LeaderboardEntry[]; myEmail: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const order = [entries[1], entries[0], entries[2]];
  const ranks = [2, 1, 3];
  const heights = [96, 128, 76];

  return (
    <Card style={styles.podiumCard}>
      <View style={styles.podium}>
        {order.map((entry, slot) => {
          if (!entry) return <View key={slot} style={styles.podiumSlot} />;
          const rank = ranks[slot];
          const medal = MEDAL_COLORS[rank - 1];
          const isMe = entry.email === myEmail;
          return (
            <View key={entry.email} style={styles.podiumSlot}>
              <View style={[styles.podiumAvatar, { borderColor: medal }]}>
                <Avatar uri={entry.profile_pic} name={fullName(entry)} size={rank === 1 ? 64 : 52} />
                <View style={[styles.medal, { backgroundColor: medal }]}>
                  <AppText variant="caption" style={styles.medalText}>
                    {rank}
                  </AppText>
                </View>
              </View>
              <AppText variant="bodyStrong" numberOfLines={1} center style={styles.podiumName}>
                {entry.first_name || fullName(entry)}
              </AppText>
              {isMe ? (
                <View style={[styles.youPill, { backgroundColor: colors.primary }]}>
                  <AppText variant="caption" style={styles.youText}>
                    {t("leaderboard.you")}
                  </AppText>
                </View>
              ) : null}
              <View style={[styles.block, { height: heights[slot], backgroundColor: withAlpha(medal, 0.18) }]}>
                <AppText variant="heading" style={{ color: medal }}>
                  {entry.points}
                </AppText>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  rank: { width: 24, textAlign: "center" },
  podiumCard: { paddingBottom: 0, paddingTop: spacing.xl, overflow: "hidden" },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  podiumSlot: { flex: 1, alignItems: "center", gap: 6 },
  podiumAvatar: { borderWidth: 3, borderRadius: 999, padding: 2 },
  medal: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: { color: "#FFFFFF", fontWeight: "800" },
  podiumName: { marginTop: spacing.xs, maxWidth: "100%" },
  youPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  youText: { color: "#FFFFFF", fontWeight: "700" },
  block: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: spacing.md,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
});
