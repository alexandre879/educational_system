import axios, { AxiosError, create, isAxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_URL } from "@/config";
import { getLanguage } from "@/i18n/language";

import * as session from "./session";

const TIMEOUT_MS = 20_000;

export const api = create({ baseURL: API_URL, timeout: TIMEOUT_MS });

let onSessionExpired: (() => void) | null = null;

/** Called when the server rejects the refresh token, i.e. the user must sign in again. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

api.interceptors.request.use((config) => {
  const token = session.getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  config.headers.set("Accept-Language", getLanguage());
  return config;
});

// Shared by concurrent 401s so the (rotating) refresh token is only spent once.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const refresh = session.getRefreshToken();

    refreshPromise = (
      refresh
        ? axios.post<{ access: string; refresh?: string }>(`${API_URL}/auth/refresh/`, { refresh }, { timeout: TIMEOUT_MS })
        : Promise.reject(new Error("No refresh token"))
    )
      .then(async ({ data }) => {
        await session.saveTokens(data.access, data.refresh);
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/** True when the server explicitly refused the refresh token (not a network hiccup). */
function isRefreshRejected(error: unknown): boolean {
  if (!isAxiosError(error)) return true; // e.g. no refresh token stored
  const status = error.response?.status;
  return status === 400 || status === 401;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !original || original._retry || !session.getRefreshToken()) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const access = await refreshAccessToken();
      original.headers.set("Authorization", `Bearer ${access}`);
      return api(original);
    } catch (refreshError) {
      if (isRefreshRejected(refreshError)) {
        await session.clearTokens();
        onSessionExpired?.();
      }
      return Promise.reject(error);
    }
  }
);

export function errorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/** The request never got an HTTP response (offline, DNS, timeout, server down). */
export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}
