import { Stack } from "expo-router";

import { useI18n } from "@/i18n";
import { useStackScreenOptions } from "@/navigation/stackOptions";

export default function MoreStack() {
  const { t } = useI18n();
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: t("more.title"), headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: t("profile.title") }} />
      <Stack.Screen name="schedule" options={{ title: t("schedule.title") }} />
      <Stack.Screen name="books" options={{ title: t("books.title") }} />
      <Stack.Screen name="leaderboard" options={{ title: t("leaderboard.title") }} />
      <Stack.Screen name="assistant" options={{ title: t("assistant.title"), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="settings" options={{ title: t("settings.title") }} />
      <Stack.Screen name="calendar" options={{ title: t("calendar.title") }} />
      <Stack.Screen name="marks" options={{ title: t("marks.title") }} />
      <Stack.Screen name="gradebook" options={{ title: t("gradebook.title") }} />
      <Stack.Screen name="search" options={{ title: t("search.title"), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="exams/index" options={{ title: t("teacherExams.title") }} />
      <Stack.Screen
        name="exams/new"
        options={{ title: t("teacherExams.create"), presentation: "modal", headerLargeTitleEnabled: false }}
      />
    </Stack>
  );
}
