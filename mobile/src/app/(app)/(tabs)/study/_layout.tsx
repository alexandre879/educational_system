import { Stack } from "expo-router";

import { useStackScreenOptions } from "@/navigation/stackOptions";

export default function StudyStack() {
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      {/* The screen draws its own large title (see study/index.tsx). */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
