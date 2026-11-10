import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, StyleSheet, Switch, View } from "react-native";

import { registerPushDevice } from "@/api/endpoints";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SegmentedControl } from "@/components/Controls";
import { Icon, type IconName } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { SUPPORTED_LANGUAGES } from "@/config";
import { LANGUAGE_NAMES, useI18n } from "@/i18n";
import { getPushPermission, isPushSupported, registerForPushAsync } from "@/notifications/push";
import { useAppLock } from "@/security/AppLock";
import { formatTime } from "@/lib/dates";
import {
  ACCENT_ORDER,
  ACCENTS,
  nextAccentChange,
  radius,
  spacing,
  useTheme,
  withAlpha,
  type AccentCycle,
  type ThemePreference,
} from "@/theme";

type PushStatus = "unsupported" | "granted" | "denied" | "undetermined";

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { colors, scheme, preference, setPreference, shownAccent, setAccent, accentCycle, setAccentCycle } = useTheme();
  const lock = useAppLock();
  const [pushStatus, setPushStatus] = useState<PushStatus>("undetermined");

  // Re-check when returning from the phone's settings app.
  useFocusEffect(
    useCallback(() => {
      if (!isPushSupported()) {
        setPushStatus("unsupported");
        return;
      }
      getPushPermission()
        .then((status) => setPushStatus(status as PushStatus))
        .catch(() => setPushStatus("unsupported"));
    }, [])
  );

  const enablePush = async () => {
    const token = await registerForPushAsync().catch(() => null);
    if (token) {
      await registerPushDevice(token, Platform.OS, language).catch(() => undefined);
      setPushStatus("granted");
    } else {
      setPushStatus((await getPushPermission().catch(() => "denied")) as PushStatus);
    }
  };

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("settings.themeSystem") },
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
  ];

  const cycleOptions: { value: AccentCycle; label: string }[] = [
    { value: 0, label: t("settings.autoOff") },
    { value: 10, label: t("settings.minutes", { count: 10 }) },
    { value: 20, label: t("settings.minutes", { count: 20 }) },
    { value: 30, label: t("settings.minutes", { count: 30 }) },
    { value: 60, label: t("settings.hour") },
  ];
  const nextChange = nextAccentChange(accentCycle);

  const pushLabel =
    pushStatus === "granted"
      ? t("settings.notificationsOn")
      : pushStatus === "unsupported"
        ? t("settings.notificationsUnavailable")
        : pushStatus === "denied"
          ? t("settings.notificationsOff")
          : null;

  return (
    <Screen>
      <SettingCard icon="language" color="#1677FF" title={t("settings.language")}>
        <SegmentedControl
          options={SUPPORTED_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] }))}
          value={language}
          onChange={setLanguage}
        />
      </SettingCard>

      <SettingCard icon="appearance" color="#8B5CF6" title={t("settings.appearance")}>
        <SegmentedControl options={themeOptions} value={preference} onChange={setPreference} />

        <AppText variant="caption" tone="secondary" style={styles.subLabel}>
          {t("settings.accent")}
        </AppText>
        <View style={styles.swatches} accessibilityRole="radiogroup">
          {ACCENT_ORDER.map((accent) => {
            const selected = shownAccent === accent;
            return (
              <Pressable
                key={accent}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setAccent(accent)}
                style={[styles.swatch, selected && { backgroundColor: colors.surfaceMuted }]}
              >
                <LinearGradient
                  colors={ACCENTS[accent][scheme].gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.swatchDot, selected && { borderColor: colors.text }]}
                />
                <AppText variant="caption" numberOfLines={1} style={{ fontWeight: selected ? "700" : "500" }}>
                  {t(`settings.accents.${accent}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="caption" tone="secondary" style={styles.subLabel}>
          {t("settings.autoAccent")}
        </AppText>
        <SegmentedControl options={cycleOptions} value={accentCycle} onChange={setAccentCycle} />
        <AppText variant="caption" tone="muted">
          {nextChange != null
            ? t("settings.autoAccentNext", { time: formatTime(new Date(nextChange)) })
            : t("settings.autoAccentHint")}
        </AppText>
      </SettingCard>

      {Platform.OS !== "web" ? (
        <SettingCard icon="lock" color="#14B8A6" title={t("settings.security")}>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{t("settings.biometricLock")}</AppText>
              <AppText variant="caption" tone="secondary">
                {lock.available ? t("settings.biometricHint") : t("settings.biometricUnavailable")}
              </AppText>
            </View>
            <Switch
              value={lock.enabled}
              disabled={!lock.available}
              onValueChange={(next) => void lock.setEnabled(next)}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </SettingCard>
      ) : null}

      <SettingCard
        icon="bell"
        color="#F59E0B"
        title={t("settings.notifications")}
        right={
          pushStatus === "granted" ? (
            <Icon name="check" size={22} color={colors.success} />
          ) : undefined
        }
      >
        {pushLabel ? (
          <AppText tone={pushStatus === "granted" ? "success" : "secondary"}>{pushLabel}</AppText>
        ) : null}
        {pushStatus === "denied" ? (
          <Button title={t("settings.openSettings")} variant="secondary" compact onPress={() => Linking.openSettings()} />
        ) : pushStatus === "undetermined" ? (
          <Button title={t("settings.enableNotifications")} variant="gradient" compact icon="bell" onPress={enablePush} />
        ) : null}
      </SettingCard>

      <View style={styles.footer}>
        <View style={[styles.logo, { backgroundColor: colors.primaryMuted }]}>
          <Icon name="school" size={26} color={colors.primary} />
        </View>
        <AppText variant="caption" tone="muted" center>
          {t("common.appName")} · {t("settings.version", { version: Constants.expoConfig?.version ?? "1.0.0" })}
        </AppText>
      </View>
    </Screen>
  );
}

/** A settings section: tinted icon tile and title, with its control underneath. */
function SettingCard({
  icon,
  color,
  title,
  right,
  children,
}: {
  icon: IconName;
  color: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={[styles.iconTile, { backgroundColor: withAlpha(color, 0.14) }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <AppText variant="subheading" style={styles.flex}>
          {title}
        </AppText>
        {right}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  subLabel: { marginTop: spacing.xs, fontWeight: "600" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  swatch: {
    width: "32%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  swatchDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  iconTile: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  footer: { marginTop: spacing.xl, alignItems: "center", gap: spacing.sm },
  logo: { width: 52, height: 52, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
