import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { registerPushDevice } from "@/api/endpoints";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";

import { NOTIFICATIONS_KEY } from "./inbox";
import { notificationHref, type NotificationTarget } from "./inboxModel";
import { registerForPushAsync } from "./push";

/** Registers this phone for the signed-in user's notifications (again whenever the language changes). */
export function usePushRegistration(): void {
  const { user } = useAuth();
  const { language } = useI18n();
  const userId = user?.id;
  // Spectators look at someone else's account read-only; their phone must not get its notifications.
  const spectating = Boolean(user?.spectator);

  useEffect(() => {
    if (!userId || spectating) return;
    let cancelled = false;

    registerForPushAsync()
      .then((token) => {
        if (token && !cancelled) return registerPushDevice(token, Platform.OS, language);
      })
      .catch(() => undefined); // notifications are optional; never block the app

    return () => {
      cancelled = true;
    };
  }, [userId, spectating, language]);
}

/** Opens the relevant screen when the user taps a notification (also on cold start). */
export function useNotificationRouting(): void {
  const response = Notifications.useLastNotificationResponse();
  const { status } = useAuth();
  const signedIn = status === "signedIn";

  useEffect(() => {
    // Wait until the restored session has mounted the app's screens.
    if (!signedIn) return;
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const href = notificationHref(response.notification.request.content.data as NotificationTarget);
    if (href) router.push(href);

    Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, [response, signedIn]);
}

/**
 * Keeps the inbox in step with push: the app icon shows the unread count, and a push that arrives
 * while the app is open refreshes the bell and the tab badges straight away.
 */
export function useInboxSync(unread: number, enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    Notifications.setBadgeCountAsync(enabled ? unread : 0).catch(() => undefined);
  }, [unread, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const subscription = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [enabled, queryClient]);
}
