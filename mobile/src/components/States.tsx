import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { errorStatus, isNetworkError, isSpectatorBlocked } from "@/api/client";
import { useI18n, type Translate } from "@/i18n";
import { spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { Button } from "./Button";
import { GlassBackdrop, useLiquidGlass } from "./Glass";
import { Icon, type IconName } from "./Icon";
import { SkeletonList } from "./Skeleton";

export function errorMessage(error: unknown, t: Translate): string {
  if (isNetworkError(error)) return t("common.networkError");
  if (isSpectatorBlocked(error)) return t("spectator.blocked");
  if (errorStatus(error) === 403) return t("common.forbidden");
  return t("common.genericError");
}

/** For failed actions: connection/permission problems, otherwise the action's own message. */
export function actionErrorMessage(error: unknown, t: Translate, fallback: string): string {
  if (isNetworkError(error)) return t("common.networkError");
  if (isSpectatorBlocked(error)) return t("spectator.blocked");
  if (errorStatus(error) === 403) return t("common.forbidden");
  return fallback;
}

/** Skeleton cards by default; a centered spinner where a list shape would be misleading. */
export function LoadingState({ variant = "list" }: { variant?: "list" | "spinner" }) {
  const { colors } = useTheme();
  if (variant === "list") return <SkeletonList />;
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();
  const glass = useLiquidGlass();
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
        <View style={[styles.iconInner, !glass && { backgroundColor: colors.surface, boxShadow: colors.shadow }]}>
          <GlassBackdrop radius={22} />
          <Icon name={icon} size={30} color={colors.primary} />
        </View>
      </View>
      <AppText variant="subheading" center>
        {title}
      </AppText>
      {message ? (
        <AppText tone="secondary" center>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={isNetworkError(error) ? "offline" : "warning"}
      title={t("common.errorTitle")}
      message={errorMessage(error, t)}
      action={onRetry ? <Button title={t("common.retry")} onPress={onRetry} variant="secondary" compact /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 280,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
