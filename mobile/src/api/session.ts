import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Tokens live in the iOS Keychain / Android Keystore; the in-memory copies
// spare a native call on every request.
const ACCESS_KEY = "auth.access";
const REFRESH_KEY = "auth.refresh";

// SecureStore doesn't exist in browsers; the web build (handy for trying the app
// on a computer) falls back to localStorage.
const storage =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
        setItemAsync: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
        deleteItemAsync: async (key: string) => globalThis.localStorage?.removeItem(key),
      }
    : SecureStore;

let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function loadTokens(): Promise<void> {
  [accessToken, refreshToken] = await Promise.all([
    storage.getItemAsync(ACCESS_KEY),
    storage.getItemAsync(REFRESH_KEY),
  ]);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export async function saveTokens(access: string, refresh?: string): Promise<void> {
  accessToken = access;
  await storage.setItemAsync(ACCESS_KEY, access);

  if (refresh) {
    refreshToken = refresh;
    await storage.setItemAsync(REFRESH_KEY, refresh);
  }
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await Promise.all([storage.deleteItemAsync(ACCESS_KEY), storage.deleteItemAsync(REFRESH_KEY)]);
}
