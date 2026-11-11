import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Show notifications that arrive while the app is open, too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

/** The Expo push token registered for this install, if any (used to unregister on sign-out). */
export function getPushToken(): string | null {
  return currentToken;
}

function easProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Remote push needs a real device, an EAS project id (`eas init`) and, on Android,
 * a development or store build — Expo Go on Android can't receive push since SDK 53.
 */
export function isPushSupported(): boolean {
  if (Platform.OS === "web" || !Device.isDevice || !easProjectId()) return false;
  const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  return !(Platform.OS === "android" && inExpoGo);
}

export async function getPushPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Ask for permission (once) and return this device's Expo push token, or null if unavailable. */
export async function registerForPushAsync(): Promise<string | null> {
  if (!isPushSupported()) return null;

  if (Platform.OS === "android") {
    // Android 13+ needs a channel before the permission prompt can appear.
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId() });
  currentToken = data;
  return data;
}

/** The red count on the app icon (cleared on sign-out). */
export async function clearAppBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0).catch(() => undefined);
}
