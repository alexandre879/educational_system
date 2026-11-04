import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useAuth, useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { ListGroup, ListRow } from "@/components/Controls";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { useI18n } from "@/i18n";
import { confirmAction } from "@/lib/dialogs";
import { fullName } from "@/lib/people";
import { radius, spacing } from "@/theme";

export default function MoreScreen() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  const name = fullName(user);

  const confirmSignOut = () => {
    confirmAction({
      title: t("more.signOutTitle"),
      message: t("more.signOutMessage"),
      confirmText: t("more.signOut"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        setSigningOut(true);
        await signOut();
      },
    });
  };

  return (
    <Screen title={t("more.title")}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("profile.title")} onPress={() => router.push("/more/profile")}>
        {({ pressed }) => (
          <Hero style={pressed && styles.pressed}>
            <View style={styles.profile}>
              <View style={styles.avatarRing}>
                <Avatar uri={user.profilePic} name={name} size={60} />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading" numberOfLines={1} style={styles.white}>
                  {name}
                </AppText>
                <AppText variant="caption" numberOfLines={1} style={styles.whiteMuted}>
                  {user.email}
                </AppText>
                {user.role ? (
                  <View style={styles.rolePill}>
                    <AppText variant="caption" style={styles.roleText}>
                      {t(`roles.${user.role}`)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <View style={styles.chevron}>
                <Icon name="chevronRight" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Hero>
        )}
      </Pressable>

      {user.role !== "admin" ? (
        <ListGroup>
          {user.role === "teacher" ? (
            <ListRow icon="gradebook" iconColor="#22C55E" title={t("gradebook.title")} onPress={() => router.push("/more/gradebook")} />
          ) : (
            <ListRow icon="marks" iconColor="#22C55E" title={t("marks.title")} onPress={() => router.push("/more/marks")} />
          )}
          {user.role === "teacher" ? (
            <ListRow icon="exams" iconColor="#F97316" title={t("teacherExams.title")} onPress={() => router.push("/more/exams")} />
          ) : null}
          <ListRow icon="calendar" iconColor="#06B6D4" title={t("calendar.title")} onPress={() => router.push("/more/calendar")} />
          {user.role === "student" ? (
            <ListRow icon="schedule" iconColor="#1677FF" title={t("schedule.title")} onPress={() => router.push("/more/schedule")} />
          ) : null}
        </ListGroup>
      ) : null}

      <ListGroup>
        {user.role !== "admin" ? (
          <ListRow icon="books" iconColor="#8B5CF6" title={t("books.title")} onPress={() => router.push("/more/books")} />
        ) : null}
        {user.role !== "admin" ? (
          <ListRow
            icon="leaderboard"
            iconColor="#F59E0B"
            title={t("leaderboard.title")}
            onPress={() => router.push("/more/leaderboard")}
          />
        ) : null}
        {user.role !== "admin" ? (
          <ListRow icon="search" iconColor="#64748B" title={t("search.title")} onPress={() => router.push("/more/search")} />
        ) : null}
        <ListRow icon="assistant" iconColor="#EC4899" title={t("assistant.title")} onPress={() => router.push("/more/assistant")} />
      </ListGroup>

      <ListGroup>
        <ListRow icon="settings" iconColor="#64748B" title={t("settings.title")} onPress={() => router.push("/more/settings")} />
      </ListGroup>

      <ListGroup>
        <ListRow
          icon="signOut"
          title={signingOut ? t("common.loading") : t("more.signOut")}
          destructive
          onPress={signingOut ? undefined : confirmSignOut}
        />
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatarRing: { padding: 3, borderRadius: 999, backgroundColor: "rgba(255, 255, 255, 0.35)" },
  white: { color: "#FFFFFF" },
  whiteMuted: { color: "rgba(255, 255, 255, 0.85)" },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  roleText: { color: "#FFFFFF", fontWeight: "700" },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});
