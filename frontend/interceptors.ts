import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/back/api";

/** Fired on `window` when the server refuses a change because this is a spectator session. */
export const SPECTATOR_BLOCKED_EVENT = "spectator:blocked";

const SUPPORTED_LOCALES = ["en", "ka", "ru"];
const DEFAULT_LOCALE = "ka";

export function currentLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const segment = window.location.pathname.split("/")[1];
  return SUPPORTED_LOCALES.includes(segment) ? segment : DEFAULT_LOCALE;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  config.headers.set("Accept-Language", currentLocale());
  return config;
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Shared by concurrent 401s so the refresh token is only spent once.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const refresh = getRefreshToken();

    refreshPromise = (
      refresh
        ? axios.post<{ access: string; refresh?: string }>(`${API_BASE_URL}/auth/refresh/`, { refresh })
        : Promise.reject(new Error("No refresh token"))
    )
      .then(({ data }) => {
        // Refresh tokens rotate: the old one is blacklisted once a new one is issued.
        setTokens(data.access, data.refresh);
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    // Spectator sessions are read-only; the spectator bar explains why nothing was saved.
    const body = error.response?.data as { code?: string } | undefined;
    if (error.response?.status === 403 && body?.code === "spectator_read_only" && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SPECTATOR_BLOCKED_EVENT));
    }

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const access = await refreshAccessToken();
      originalRequest.headers.set("Authorization", `Bearer ${access}`);
      return api(originalRequest);
    } catch (refreshError) {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = `/${currentLocale()}/login`;
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
