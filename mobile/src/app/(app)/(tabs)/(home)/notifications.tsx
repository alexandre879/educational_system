import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { AppNotification } from "@/api/types";
import { AppText } from "@/components/AppText";
import { ListGroup } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { NotificationRow } from "@/features/notifications/NotificationRow";
import { useI18n } from "@/i18n";
import { useMarkNotificationsRead, useNotificationList, useNotificationSummary } from "@/notifications/inbox";
import { itemHref } from "@/notifications/inboxModel";
import { spacing, useTheme } from "@/theme";

export default function NotificationsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: items, error, isPending, isRefetching, refetch } = useNotificationList();
  const { unread } = useNotificationSummary();
  const { canMark, markRead } = useMarkNotificationsRead();
  // "5 min ago" is measured from when the list was opened or refreshed.
  const [now, setNow] = useState(() => new Date());

  const refresh = () => {
    setNow(new Date());
    return refetch();
  };

  const open = (item: AppNotification) => {
    if (!item.read) markRead({ ids: [item.id] });
    const href = itemHref(item);
    if (href) router.push(href);
  };

  return (
    <Screen onRefresh={refresh} refreshing={isRefetching}>
      {unread > 0 ? (
        <View style={styles.summary}>
          <AppText variant="bodyStrong" tone="secondary">
            {t("notifications.unreadCount", { count: unread })}
          </AppText>
          {canMark ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => markRead({ all: true })}
              style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
            >
              <Icon name="checkmark" size={15} color={colors.primary} />
              <AppText variant="bodyStrong" tone="primary">
                {t("notifications.markAll")}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isPending ? (
        <LoadingState />
      ) : error || !items ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="bell" title={t("notifications.empty")} message={t("notifications.emptyHint")} />
      ) : (
        <ListGroup>
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} now={now} onPress={open} />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  markAll: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  pressed: { opacity: 0.6 },
});
