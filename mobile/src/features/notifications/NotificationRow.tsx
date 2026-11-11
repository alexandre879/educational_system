import { Pressable, StyleSheet, View } from "react-native";

import type { AppNotification } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Icon, type IconName } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { formatRelative } from "@/lib/dates";
import { radius, spacing, useTheme, withAlpha } from "@/theme";

// The same colours as the website's notification icons.
const KINDS: Record<string, { icon: IconName; color: string }> = {
  announcement: { icon: "announcements", color: "#8B5CF6" },
  exercise: { icon: "exercises", color: "#14B8A6" },
  exam: { icon: "exams", color: "#F97316" },
  mark: { icon: "marks", color: "#F59E0B" },
  attendance: { icon: "attendance", color: "#22C55E" },
};
const FALLBACK = { icon: "bell" as const, color: "#3B82F6" };

export function NotificationRow({
  item,
  now,
  onPress,
}: {
  item: AppNotification;
  now: Date;
  onPress: (item: AppNotification) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { icon, color } = KINDS[item.kind] ?? FALLBACK;
  const unread = !item.read;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `${t("notifications.unread")}: ${item.title}` : item.title}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        unread && { backgroundColor: withAlpha(colors.primary, 0.07) },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1} style={unread ? styles.unreadTitle : undefined}>
          {item.title}
        </AppText>
        {item.body ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {item.body}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted">
          {formatRelative(item.created_at, t, now)}
        </AppText>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  unreadTitle: { fontWeight: "800" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
});
