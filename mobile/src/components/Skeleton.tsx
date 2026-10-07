import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type DimensionValue } from "react-native";

import { radius, spacing, useTheme } from "@/theme";

/** A pulsing placeholder block shown while content loads. */
export function Skeleton({ width = "100%", height = 14, rounded = 8 }: { width?: DimensionValue; height?: number; rounded?: number }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceMuted, opacity }}
    />
  );
}

/** Placeholder shaped like a content card. */
export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.shadow }]}>
      <View style={styles.row}>
        <Skeleton width={42} height={42} rounded={12} />
        <View style={styles.lines}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="35%" height={12} />
        </View>
      </View>
      <Skeleton width="90%" height={12} />
      <Skeleton width="70%" height={12} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  lines: { flex: 1, gap: spacing.sm },
});
