import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useCurrentUser } from "@/auth/AuthProvider";
import { ICONS } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { useInboxSync } from "@/notifications/hooks";
import { useNotificationTabs } from "@/notifications/inbox";
import { badgeLabel } from "@/notifications/inboxModel";
import { useTheme } from "@/theme";

export default function TabsLayout() {
  const user = useCurrentUser();
  const { t } = useI18n();
  const { colors } = useTheme();
  // Unread notifications: a count on each tab, and on the app icon.
  const { unread, badges } = useNotificationTabs();
  useInboxSync(unread, !user.spectator);

  // Android shows at most five tabs, so the second slot is the role's main tool.
  const roleTab =
    user.role === "student"
      ? { label: t("tabs.exams"), icon: ICONS.exams }
      : user.role === "teacher"
        ? { label: t("tabs.attendance"), icon: ICONS.attendance }
        : user.role === "parent"
          ? { label: t("tabs.schedule"), icon: ICONS.schedule }
          : null;

  return (
    <NativeTabs
      tintColor={colors.primary}
      indicatorColor={colors.primaryMuted}
      backgroundColor={Platform.OS === "android" ? colors.surface : undefined}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={ICONS.home.ios} md={ICONS.home.android} />
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="study" hidden={!roleTab}>
        <NativeTabs.Trigger.Icon
          sf={(roleTab ?? { icon: ICONS.exams }).icon.ios}
          md={(roleTab ?? { icon: ICONS.exams }).icon.android}
        />
        <NativeTabs.Trigger.Label>{roleTab?.label ?? t("tabs.exams")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!badges.study}>{badgeLabel(badges.study)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="exercises" hidden={user.role === "admin"}>
        <NativeTabs.Trigger.Icon sf={ICONS.exercises.ios} md={ICONS.exercises.android} />
        <NativeTabs.Trigger.Label>{t("tabs.exercises")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!badges.exercises}>{badgeLabel(badges.exercises)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="announcements">
        <NativeTabs.Trigger.Icon sf={ICONS.announcements.ios} md={ICONS.announcements.android} />
        <NativeTabs.Trigger.Label>{t("tabs.announcements")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!badges.announcements}>{badgeLabel(badges.announcements)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf={ICONS.more.ios} md={ICONS.more.android} />
        <NativeTabs.Trigger.Label>{t("tabs.more")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!badges.more}>{badgeLabel(badges.more)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
