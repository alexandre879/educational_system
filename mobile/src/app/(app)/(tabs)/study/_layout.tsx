import { Stack } from "expo-router";

import { useCurrentUser } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useStackScreenOptions } from "@/navigation/stackOptions";

export default function StudyStack() {
  const { t } = useI18n();
  const user = useCurrentUser();
  const screenOptions = useStackScreenOptions();

  const title =
    user.role === "teacher"
      ? t("attendance.title")
      : user.role === "parent"
        ? t("schedule.title")
        : t("exams.title");

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
