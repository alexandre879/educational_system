import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { GlassBackdrop, useLiquidGlass } from "./Glass";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  const { colors } = useTheme();
  const glass = useLiquidGlass();
  // On iOS 26 the card is a pane of Liquid Glass; elsewhere a solid surface.
  const base = [
    styles.card,
    glass
      ? { borderColor: colors.border }
      : { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.shadow },
    style,
  ];
  const cornerRadius = Number(StyleSheet.flatten(style)?.borderRadius ?? radius.lg);
  const backdrop = <GlassBackdrop radius={cornerRadius} />;

  if (!onPress) {
    return (
      <View style={base}>
        {backdrop}
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {backdrop}
      {children}
    </Pressable>
  );
}

interface SectionHeaderProps {
  title: string;
  /** Optional link on the right, e.g. "See all". */
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
          <AppText variant="bodyStrong" tone="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
});
