import Constants from "expo-constants";

/**
 * In development the API is assumed to run on the same computer as the Expo dev
 * server (`python manage.py runserver 0.0.0.0:8000`), so its address follows the
 * computer across Wi-Fi networks and hotspots without editing any config.
 */
function devMachineApiUrl(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return __DEV__ && host ? `http://${host}:8000/api` : null;
}

/**
 * Base URL of the Django API. `EXPO_PUBLIC_API_URL` wins when set: store builds get
 * it from eas.json, and `.env.local` can override the development default.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  devMachineApiUrl() ||
  "http://localhost:8000/api"
).replace(/\/+$/, "");

export const SUPPORTED_LANGUAGES = ["ka", "en", "ru"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "ka";
