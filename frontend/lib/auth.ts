import Cookies from "js-cookie";

const ACCESS_COOKIE = "access";
const REFRESH_COOKIE = "refresh";

// `lax` (not `strict`) so the middleware still sees the session when the app
// is opened from a link in another site or app.
function cookieAttributes(): Cookies.CookieAttributes {
  return {
    path: "/",
    sameSite: "lax",
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  };
}

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_COOKIE);
}

export function setTokens(access: string, refresh?: string): void {
  Cookies.set(ACCESS_COOKIE, access, cookieAttributes());
  if (refresh) Cookies.set(REFRESH_COOKIE, refresh, cookieAttributes());
}

export function clearTokens(): void {
  Cookies.remove(ACCESS_COOKIE, { path: "/" });
  Cookies.remove(REFRESH_COOKIE, { path: "/" });
}
