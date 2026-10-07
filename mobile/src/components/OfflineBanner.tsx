import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { Icon } from "./Icon";

const subscribe = (callback: () => void) => onlineManager.subscribe(callback);
const isOnline = () => onlineManager.isOnline();

/** Small pill at the top while the phone has no connection; screens keep showing saved data. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true);
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View pointerEvents="none" style={[styles.wrapper, { top: insets.top + spacing.xs }]}>
      <View style={[styles.pill, { backgroundColor: colors.text }]}>
        <Icon name="offline" size={14} color={colors.background} />
        <AppText variant="caption" style={[styles.text, { color: colors.background }]}>
          {t("offline.banner")}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    opacity: 0.92,
  },
  text: { fontWeight: "600" },
});
