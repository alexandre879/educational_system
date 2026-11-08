import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "gradient" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = "primary", icon, loading, disabled, compact, style }: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const background = {
    primary: colors.primary,
    gradient: "transparent",
    secondary: colors.primaryMuted,
    ghost: "transparent",
    danger: colors.dangerMuted,
  }[variant];

  const foreground = {
    primary: colors.onPrimary,
    gradient: colors.onGradient,
    secondary: colors.primary,
    ghost: colors.primary,
    danger: colors.danger,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: background, opacity: inactive ? 0.5 : 1 },
        pressed && styles.pressed,
        style,
      ]}
    >
      {variant === "gradient" ? (
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={18} color={foreground} /> : null}
          <AppText variant="bodyStrong" style={{ color: foreground }}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  compact: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
