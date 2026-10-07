import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { radius, spacing, useTheme, type Colors } from "@/theme";

/** Marks are 1–10: 9–10 excellent, 7–8 good, 5–6 fair, lower needs attention. */
export function markTone(value: number, colors: Colors): { color: string; background: string } {
  if (value >= 9) return { color: colors.success, background: colors.successMuted };
  if (value >= 7) return { color: colors.primary, background: colors.primaryMuted };
  if (value >= 5) return { color: colors.warning, background: colors.warningMuted };
  return { color: colors.danger, background: colors.dangerMuted };
}

export function MarkChip({ value, onPress, size = 36 }: { value: number; onPress?: () => void; size?: number }) {
  const { colors } = useTheme();
  const tone = markTone(value, colors);
  const style = [styles.chip, { width: size, height: size, borderRadius: size * 0.33, backgroundColor: tone.background }];
  const label = (
    <AppText variant="bodyStrong" style={{ color: tone.color }}>
      {value}
    </AppText>
  );

  if (!onPress) return <View style={style}>{label}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {label}
    </Pressable>
  );
}

/** "8.4" pill coloured like a mark, or a dash when there are no marks yet. */
export function AverageBadge({ value, large }: { value: number | null; large?: boolean }) {
  const { colors } = useTheme();
  const tone = value === null ? { color: colors.textMuted, background: colors.surfaceMuted } : markTone(Math.round(value), colors);
  return (
    <View style={[styles.average, large && styles.averageLarge, { backgroundColor: tone.background }]}>
      <AppText variant={large ? "title" : "bodyStrong"} style={{ color: tone.color }}>
        {value === null ? "—" : value.toFixed(1)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  average: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, minWidth: 52, alignItems: "center" },
  averageLarge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, minWidth: 84 },
});
