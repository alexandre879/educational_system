import { API_BASE_URL } from "@/interceptors";

/**
 * Some endpoints return uploaded files as paths (`media/…`) rather than full URLs
 * (local storage instead of S3); resolve those against the API's host.
 */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, new URL(API_BASE_URL, window.location.origin)).toString();
  } catch {
    return path;
  }
}
