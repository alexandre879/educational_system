import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Linking, Platform, StyleSheet, Switch, View } from "react-native";

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
import { radius, spacing, useTheme, withAlpha, type ThemePreference } from "@/theme";

type PushStatus = "unsupported" | "granted" | "denied" | "undetermined";

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { colors, preference, setPreference } = useTheme();
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
  iconTile: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  footer: { marginTop: spacing.xl, alignItems: "center", gap: spacing.sm },
  logo: { width: 52, height: 52, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
