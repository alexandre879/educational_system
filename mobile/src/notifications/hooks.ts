import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { registerPushDevice } from "@/api/endpoints";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";

import { registerForPushAsync } from "./push";

/** Registers this phone for the signed-in user's notifications (again whenever the language changes). */
export function usePushRegistration(): void {
  const { user } = useAuth();
  const { language } = useI18n();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    registerForPushAsync()
      .then((token) => {
        if (token && !cancelled) return registerPushDevice(token, Platform.OS, language);
      })
      .catch(() => undefined); // notifications are optional; never block the app

    return () => {
      cancelled = true;
    };
  }, [userId, language]);
}

type NotificationData = { type?: string; id?: number; date?: string; comment?: number };

/** Opens the relevant screen when the user taps a notification (also on cold start). */
export function useNotificationRouting(): void {
  const response = Notifications.useLastNotificationResponse();
  const { status } = useAuth();
  const signedIn = status === "signedIn";

  useEffect(() => {
    // Wait until the restored session has mounted the app's screens.
    if (!signedIn) return;
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const data = response.notification.request.content.data as NotificationData;

    switch (data.type) {
      case "announcement":
        if (data.id) {
          router.push({
            pathname: "/announcements/[id]",
            // Comment and reply notifications open the thread at that message.
            params: data.comment ? { id: String(data.id), comment: String(data.comment) } : { id: String(data.id) },
          });
        }
        break;
      case "exercise":
        router.push({ pathname: "/exercises", params: data.date ? { date: data.date } : {} });
        break;
      case "attendance":
        router.push("/");
        break;
      case "exam":
        router.push("/study");
        break;
      case "mark":
        router.push("/more/marks");
        break;
    }

    Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, [response, signedIn]);
}
