import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { LinearGradient } from "expo-linear-gradient";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { spacing, useTheme } from "@/theme";

const STORAGE_KEY = "pref.biometricLock";
// Coming back after a quick app switch doesn't ask again.
const RELOCK_AFTER_MS = 60_000;

interface AppLockContextValue {
  /** The phone has Face ID / a fingerprint set up. */
  available: boolean;
  enabled: boolean;
  /** Turning it on asks for biometrics first; resolves to the new state. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

async function biometricsAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Optional Face ID / fingerprint lock over the signed-in app. */
export function AppLockProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { status } = useAuth();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(Platform.OS === "web");
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    Promise.all([biometricsAvailable(), AsyncStorage.getItem(STORAGE_KEY).catch(() => null)]).then(
      ([hasBiometrics, stored]) => {
        const on = hasBiometrics && stored === "1";
        setAvailable(hasBiometrics);
        setEnabledState(on);
        setLocked(on);
        setReady(true);
      }
    );
  }, []);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("lock.prompt"),
        cancelLabel: t("common.cancel"),
      });
      if (result.success) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, [t]);

  // Lock again when the app returns after a while in the background.
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAt.current = Date.now();
      } else if (state === "active" && backgroundedAt.current !== null) {
        if (Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  const showLock = status === "signedIn" && (!ready || (enabled && locked));

  // Ask straight away instead of making the user tap "Unlock" first.
  useEffect(() => {
    if (showLock && ready && AppState.currentState === "active") void unlock();
  }, [showLock, ready, unlock]);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (next) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t("settings.biometricLock"),
          cancelLabel: t("common.cancel"),
        });
        if (!result.success) return false;
      }
      setEnabledState(next);
      AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0").catch(() => undefined);
      return next;
    },
    [t]
  );

  const value = useMemo(() => ({ available, enabled, setEnabled }), [available, enabled, setEnabled]);

  return (
    <AppLockContext.Provider value={value}>
      {children}
      {showLock ? <LockScreen ready={ready} onUnlock={unlock} /> : null}
    </AppLockContext.Provider>
  );
}

function LockScreen({ ready, onUnlock }: { ready: boolean; onUnlock: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {ready ? (
        <View style={styles.content}>
          <View style={styles.badge}>
            <Icon name="lock" size={34} color={colors.primary} />
          </View>
          <AppText variant="title" center style={styles.white}>
            {t("lock.title")}
          </AppText>
          <AppText center style={styles.whiteMuted}>
            {t("lock.message")}
          </AppText>
          <Button title={t("lock.unlock")} icon="biometrics" variant="secondary" onPress={onUnlock} style={styles.button} />
        </View>
      ) : null}
    </View>
  );
}

export function useAppLock(): AppLockContextValue {
  const context = useContext(AppLockContext);
  if (!context) throw new Error("useAppLock must be used inside AppLockProvider");
  return context;
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: spacing.sm,
  },
  white: { color: "#FFFFFF" },
  whiteMuted: { color: "rgba(255, 255, 255, 0.85)" },
  button: { alignSelf: "stretch", marginTop: spacing.lg, backgroundColor: "#FFFFFF" },
});
