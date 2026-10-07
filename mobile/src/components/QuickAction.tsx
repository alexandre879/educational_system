import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { radius, spacing, useTheme, withAlpha } from "@/theme";

import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

interface QuickActionProps {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
}

/** Square shortcut tile with a tinted icon, shown in a row on the home screen. */
export function QuickAction({ icon, label, color, onPress }: QuickActionProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.shadow },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <AppText variant="caption" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function QuickActionRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "600" },
});
