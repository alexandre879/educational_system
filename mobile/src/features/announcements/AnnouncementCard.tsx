import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import type { Announcement } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { SubjectBadge } from "@/components/Subject";
import { useI18n } from "@/i18n";
import { formatRelative } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

export function AnnouncementCard({ announcement, compact }: { announcement: Announcement; compact?: boolean }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const author = announcement.created_by.name || announcement.created_by.email;

  return (
    <Card
      onPress={() => router.push({ pathname: "/announcements/[id]", params: { id: String(announcement.id) } })}
      accessibilityLabel={announcement.title}
      style={styles.card}
    >
      <View style={styles.header}>
        <Avatar name={author} size={36} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {author}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatRelative(announcement.created_at, t)}
          </AppText>
        </View>
        {announcement.subject ? (
          <SubjectBadge subjectId={announcement.subject.id} label={localize(announcement.subject.name, language)} />
        ) : null}
      </View>

      <AppText variant="subheading" numberOfLines={2}>
        {announcement.title}
      </AppText>
      <AppText tone="secondary" numberOfLines={compact ? 2 : 3}>
        {announcement.content}
      </AppText>

      <View style={[styles.comments, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name="comment" size={14} color={colors.textSecondary} />
        <AppText variant="caption" tone="secondary" style={styles.commentsText}>
          {announcement.len_comments}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  comments: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  commentsText: { fontWeight: "700" },
});
