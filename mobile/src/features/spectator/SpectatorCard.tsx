import { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { SpectatorInfo, SpectatorRole } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge, SegmentedControl } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { spacing, useTheme } from "@/theme";

/** On Home in spectator sessions: says it's read-only, switches between roles, and leads out. */
export function SpectatorCard({ info }: { info: SpectatorInfo }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { switchSpectatorView, signOut } = useAuth();
  const toast = useToast();
  const [switching, setSwitching] = useState<SpectatorRole | null>(null);

  const switchTo = async (role: SpectatorRole) => {
    if (role === info.viewing_as || switching) return;
    setSwitching(role);
    try {
      await switchSpectatorView(role);
    } catch {
      toast(t("spectator.switchFailed"), "error");
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.header}>
          <Icon name="eye" size={18} color={colors.primary} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {t("spectator.badge")}
          </AppText>
          <Badge label={t("spectator.readOnly")} />
        </View>

        <AppText variant="caption" tone="secondary">
          {info.roles.length > 1 ? t("spectator.viewingAs") : `${t("spectator.viewingAs")} ${t(`roles.${info.viewing_as}`)}`}
        </AppText>
        {info.roles.length > 1 ? (
          <SegmentedControl
            options={info.roles.map((role) => ({ value: role, label: t(`roles.${role}`) }))}
            value={switching ?? info.viewing_as}
            onChange={(role) => void switchTo(role)}
          />
        ) : null}

        <Button title={t("spectator.exit")} icon="signOut" variant="ghost" compact onPress={() => void signOut()} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
