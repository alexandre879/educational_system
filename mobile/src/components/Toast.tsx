import * as Haptics from "expo-haptics";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { Icon } from "./Icon";

type ToastKind = "success" | "error";

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

const VISIBLE_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, kind });
    Haptics.notificationAsync(
      kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    ).catch(() => undefined);
  }, []);

  const hide = useCallback(() => setToast(null), []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onHidden={hide} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onHidden }: { toast: ToastState; onHidden: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(VISIBLE_MS),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onHidden());
    return () => animation.stop();
  }, [opacity, onHidden]);

  const tint = toast.kind === "success" ? colors.success : colors.danger;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { opacity, top: insets.top + spacing.sm, backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Icon name={toast.kind === "success" ? "check" : "warning"} size={20} color={tint} />
      <AppText variant="bodyStrong" style={styles.text}>
        {toast.message}
      </AppText>
    </Animated.View>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider");
  return show;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  text: { flex: 1 },
});
