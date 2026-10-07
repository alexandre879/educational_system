import { Stack } from "expo-router";

import { useI18n } from "@/i18n";
import { useStackScreenOptions } from "@/navigation/stackOptions";

export default function ExercisesStack() {
  const { t } = useI18n();
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: t("exercises.title") }} />
      <Stack.Screen
        name="new"
        options={{ title: t("exercises.add"), presentation: "modal", headerLargeTitleEnabled: false }}
      />
    </Stack>
  );
}
