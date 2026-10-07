import { Stack } from "expo-router";

import { useI18n } from "@/i18n";
import { useStackScreenOptions } from "@/navigation/stackOptions";

export default function HomeStack() {
  const { t } = useI18n();
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      {/* The gradient hero opens the screen, so no title bar. */}
      <Stack.Screen name="index" options={{ title: t("home.title"), headerShown: false }} />
      <Stack.Screen name="child/[id]" options={{ title: "", headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
