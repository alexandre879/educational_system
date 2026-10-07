import { Tabs } from "expo-router/js-tabs";
import type { ColorValue } from "react-native";

import { useCurrentUser } from "@/auth/AuthProvider";
import { Icon, type IconName } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";

// Browser preview: a regular bottom tab bar (native tabs render as a floating top
// bar on web, which covers page titles). Same tabs and role rules as _layout.tsx.
export default function WebTabsLayout() {
  const user = useCurrentUser();
  const { t } = useI18n();
  const { colors } = useTheme();

  const roleTab: { label: string; icon: IconName } | null =
    user.role === "student"
      ? { label: t("tabs.exams"), icon: "exams" }
      : user.role === "teacher"
        ? { label: t("tabs.attendance"), icon: "attendance" }
        : user.role === "parent"
          ? { label: t("tabs.schedule"), icon: "schedule" }
          : null;

  const icon = (name: IconName) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return <Icon name={name} size={22} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: t("tabs.home"), tabBarIcon: icon("home") }} />
      <Tabs.Screen
        name="study"
        options={{
          title: roleTab?.label ?? t("tabs.exams"),
          tabBarIcon: icon(roleTab?.icon ?? "exams"),
          href: roleTab ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: t("tabs.exercises"),
          tabBarIcon: icon("exercises"),
          href: user.role === "admin" ? null : undefined,
        }}
      />
      <Tabs.Screen name="announcements" options={{ title: t("tabs.announcements"), tabBarIcon: icon("announcements") }} />
      <Tabs.Screen name="more" options={{ title: t("tabs.more"), tabBarIcon: icon("more") }} />
    </Tabs>
  );
}
