import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, useTheme } from "@/theme";

interface ScreenProps {
  children: ReactNode;
  /** Enables pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** For screens without a navigation header: keep content below the status bar. */
  headerless?: boolean;
}

/** Scrollable page body that cooperates with native (large-title) headers. */
export function Screen({ children, onRefresh, refreshing = false, contentStyle, headerless }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, headerless && { paddingTop: insets.top + spacing.sm }, contentStyle]}
      contentInsetAdjustmentBehavior={headerless ? "never" : "automatic"}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
});
