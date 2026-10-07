import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { updateProfile, type ProfileUpdate } from "@/api/endpoints";
import { useAuth, useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { fullName } from "@/lib/people";
import { radius, spacing, useTheme } from "@/theme";

export default function ProfileScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { setUser } = useAuth();
  const user = useCurrentUser();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [photo, setPhoto] = useState<ProfileUpdate["photo"]>();
  const [saving, setSaving] = useState(false);

  const dirty = firstName !== user.first_name || lastName !== user.last_name || !!photo;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? "profile.jpg",
      type: asset.mimeType ?? "image/jpeg",
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), photo });
      setUser(updated);
      setPhoto(undefined);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast(t("profile.saved"));
    } catch {
      toast(t("profile.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Hero>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("profile.changePhoto")} onPress={pickPhoto}>
            <View style={styles.avatarRing}>
              <Avatar uri={photo?.uri ?? user.profilePic} name={fullName(user)} size={96} />
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: colors.surface }]}>
              <Icon name="camera" size={16} color={colors.primary} />
            </View>
          </Pressable>
          <AppText variant="title" center numberOfLines={1} style={styles.white}>
            {fullName(user)}
          </AppText>
          {user.role ? (
            <View style={styles.rolePill}>
              <AppText variant="caption" style={styles.roleText}>
                {t(`roles.${user.role}`)}
              </AppText>
            </View>
          ) : null}
          <Pressable onPress={pickPhoto} hitSlop={8}>
            <AppText variant="caption" style={styles.whiteMuted}>
              {t("profile.changePhoto")}
            </AppText>
          </Pressable>
        </View>
      </Hero>

      <Card>
        <TextField
          label={t("profile.firstName")}
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="given-name"
          textContentType="givenName"
        />
        <TextField
          label={t("profile.lastName")}
          value={lastName}
          onChangeText={setLastName}
          autoComplete="family-name"
          textContentType="familyName"
        />
        <TextField label={t("profile.email")} value={user.email} editable={false} hint={t("profile.emailHint")} />
      </Card>

      <Button
        title={t("common.save")}
        variant={dirty ? "gradient" : "primary"}
        onPress={save}
        loading={saving}
        disabled={!dirty}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  avatarRing: { padding: 4, borderRadius: 999, backgroundColor: "rgba(255, 255, 255, 0.35)" },
  white: { color: "#FFFFFF", maxWidth: "100%" },
  whiteMuted: { color: "rgba(255, 255, 255, 0.85)", fontWeight: "600" },
  rolePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  roleText: { color: "#FFFFFF", fontWeight: "700" },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.25)",
  },
});
