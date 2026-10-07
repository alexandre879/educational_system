import { Stack } from "expo-router";

import { useAuth } from "@/auth/AuthProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useI18n } from "@/i18n";
import { useStackScreenOptions } from "@/navigation/stackOptions";
import { useNotificationRouting, usePushRegistration } from "@/notifications/hooks";

export default function AppLayout() {
  const { status } = useAuth();
  const { t } = useI18n();
  const stackOptions = useStackScreenOptions();
  usePushRegistration();
  useNotificationRouting();

  // Still restoring the session (splash screen is up): keep the requested route,
  // render it once the user is known.
  if (status !== "signedIn") return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* Exams take over the screen and can't be swiped away by accident. */}
        <Stack.Screen name="exam/[id]" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        <Stack.Screen
          name="review/[sessionId]"
          options={{
            ...stackOptions,
            headerShown: true,
            headerLargeTitleEnabled: false,
            presentation: "modal",
            title: t("review.title"),
          }}
        />
      </Stack>
      <OfflineBanner />
    </>
  );
}
