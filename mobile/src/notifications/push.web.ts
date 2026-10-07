// Web version of ./push.ts: browsers can't receive the app's push notifications,
// and expo-notifications' native APIs aren't available there.

export function getPushToken(): string | null {
  return null;
}

export function isPushSupported(): boolean {
  return false;
}

export async function getPushPermission(): Promise<"denied"> {
  return "denied";
}

export async function registerForPushAsync(): Promise<string | null> {
  return null;
}
