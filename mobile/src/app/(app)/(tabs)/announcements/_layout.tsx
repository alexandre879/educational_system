import { Stack } from "expo-router";

import { useI18n } from "@/i18n";
import { useStackScreenOptions } from "@/navigation/stackOptions";

export default function AnnouncementsStack() {
  const { t } = useI18n();
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: t("announcements.title"), headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "", headerLargeTitleEnabled: false }} />
      <Stack.Screen
        name="new"
        options={{ title: t("announcements.add"), presentation: "modal", headerLargeTitleEnabled: false }}
      />
    </Stack>
  );
}
