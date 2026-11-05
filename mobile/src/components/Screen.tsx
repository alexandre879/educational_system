import { createContext, useContext, type ReactNode } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { GlassBackdrop, useLiquidGlass } from "./Glass";
import { Icon, type IconName } from "./Icon";

interface ScreenTitle {
  title: string;
  /** Buttons on the right of the title, e.g. <TitleAction />. */
  actions?: ReactNode;
}

/**
 * Lets a tab's root route give the screen it renders a large title, when that screen comes
 * from a shared view (e.g. the first tab shows exams, attendance or the schedule by role).
 */
export const ScreenTitleContext = createContext<ScreenTitle | null>(null);

interface ScreenProps {
  children: ReactNode;
  /** Enables pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** For screens without a navigation header: keep content below the status bar. */
  headerless?: boolean;
  /**
   * A large title drawn in the page itself, for tab roots (which hide the native header, like
   * Home): the page's backdrop then runs edge to edge, behind the status bar too.
   */
  title?: string;
  actions?: ReactNode;
}

/** Scrollable page body that cooperates with native headers, or draws its own large title. */
export function Screen({ children, onRefresh, refreshing = false, contentStyle, headerless, title, actions }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fromContext = useContext(ScreenTitleContext);
  const largeTitle = title ?? fromContext?.title;
  const titleActions = actions ?? fromContext?.actions;

  // iOS insets the content for the status bar and tab bar itself ("automatic"); Android needs
  // the status-bar padding added by hand.
  const topPadding =
    headerless || (largeTitle && Platform.OS !== "ios") ? { paddingTop: insets.top + spacing.sm } : null;

  return (
    <ScrollView
      // Clear, so the screen's full-height backdrop (see useStackScreenOptions) shows through.
      style={styles.scroll}
      contentContainerStyle={[styles.content, topPadding, contentStyle]}
      contentInsetAdjustmentBehavior={headerless ? "never" : "automatic"}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {largeTitle ? (
        <View style={styles.titleRow}>
          <AppText variant="title" accessibilityRole="header" numberOfLines={1} style={styles.largeTitle}>
            {largeTitle}
          </AppText>
          {titleActions ? <View style={styles.titleActions}>{titleActions}</View> : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

/** A round glass button for the large-title row (e.g. "add"). */
export function TitleAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const glass = useLiquidGlass();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.action,
        glass ? { borderColor: colors.border } : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.actionPressed,
      ]}
    >
      <GlassBackdrop radius={ACTION_SIZE / 2} />
      <Icon name={icon} size={20} color={colors.primary} />
    </Pressable>
  );
}

const ACTION_SIZE = 42;

const styles = StyleSheet.create({
  scroll: { backgroundColor: "transparent" },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  largeTitle: { flex: 1, fontSize: 34, lineHeight: 41, letterSpacing: -0.8 },
  titleActions: { flexDirection: "row", gap: spacing.sm },
  action: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
});
