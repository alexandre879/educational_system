import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, spacing, useTheme } from "@/theme";

/** Brand-gradient banner with soft decorative circles; content sits on top in white. */
export function Hero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { boxShadow: "0px 12px 32px rgba(22, 119, 255, 0.28)" }, style]}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.circle, styles.circleLarge]} />
      <View style={[styles.circle, styles.circleSmall]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.xl, overflow: "hidden" },
  content: { padding: spacing.xl, gap: spacing.md },
  circle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255, 255, 255, 0.10)" },
  circleLarge: { width: 220, height: 220, top: -90, right: -60 },
  circleSmall: { width: 120, height: 120, bottom: -50, right: 70, backgroundColor: "rgba(255, 255, 255, 0.07)" },
});
