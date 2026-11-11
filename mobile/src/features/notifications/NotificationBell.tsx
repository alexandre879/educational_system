import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { useNotificationSummary } from "@/notifications/inbox";
import { badgeLabel } from "@/notifications/inboxModel";
import { useTheme } from "@/theme";

const SIZE = 38;

/** The bell on the home banner: opens the notifications list, with the unread count on it. */
export function NotificationBell() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { unread } = useNotificationSummary();
  const label = badgeLabel(unread);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        label ? `${t("notifications.title")}, ${t("notifications.unreadCount", { count: unread })}` : t("notifications.title")
      }
      hitSlop={6}
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Glass
        radius={SIZE / 2}
        variant="clear"
        tint="rgba(255, 255, 255, 0.14)"
        style={styles.bell}
        fallbackStyle={styles.fallback}
      >
        <Icon name="bell" size={20} color="#FFFFFF" />
      </Glass>
      {label ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <AppText style={styles.badgeText}>{label}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  fallback: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  badge: {
    position: "absolute",
    top: -4,
    right: -5,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10.5, lineHeight: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
