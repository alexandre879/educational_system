import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

import { api, setSessionExpiredHandler } from "@/api/client";
import * as session from "@/api/session";
import { API_URL } from "@/config";

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  const response = { status, statusText: String(status), data, headers: {}, config };
  if (status >= 400) {
    return Promise.reject(new AxiosError(`HTTP ${status}`, "ERR_BAD_REQUEST", config, null, response));
  }
  return Promise.resolve(response);
}

let refreshCalls = 0;
let refreshBehaviour: "ok" | "reject" | "offline" = "ok";

// A tiny fake server: /home/ needs the "new" access token; refresh rotates tokens.
const adapter: AxiosAdapter = async (config) => {
  if (config.url === `${API_URL}/auth/refresh/`) {
    refreshCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (refreshBehaviour === "offline") throw new AxiosError("Network Error", "ERR_NETWORK", config);
    if (refreshBehaviour === "reject") return respond(config, 401);
    return respond(config, 200, { access: "new-access", refresh: "new-refresh" });
  }

  const auth = String(config.headers?.Authorization ?? "");
  return auth === "Bearer new-access" ? respond(config, 200, { ok: true }) : respond(config, 401);
};

beforeAll(() => {
  api.defaults.adapter = adapter;
  axios.defaults.adapter = adapter; // used for the refresh call itself
});

beforeEach(async () => {
  refreshCalls = 0;
  refreshBehaviour = "ok";
  await session.saveTokens("old-access", "old-refresh");
});

afterEach(() => setSessionExpiredHandler(null));

describe("API client token refresh", () => {
  it("refreshes once for concurrent 401s and retries every request", async () => {
    const results = await Promise.all([api.get("/home/"), api.get("/home/"), api.get("/home/")]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls).toBe(1);
    // The rotated refresh token replaces the old one.
    expect(session.getAccessToken()).toBe("new-access");
    expect(session.getRefreshToken()).toBe("new-refresh");
  });

  it("signs out when the server rejects the refresh token", async () => {
    refreshBehaviour = "reject";
    const onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);

    await expect(api.get("/home/")).rejects.toBeInstanceOf(AxiosError);

    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(session.getRefreshToken()).toBeNull();
  });

  it("keeps the session when the refresh fails only because of the network", async () => {
    refreshBehaviour = "offline";
    const onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);

    await expect(api.get("/home/")).rejects.toBeInstanceOf(AxiosError);

    expect(onExpired).not.toHaveBeenCalled();
    expect(session.getRefreshToken()).toBe("old-refresh");
  });

  it("sends the app language with every request", async () => {
    await session.saveTokens("new-access");
    const response = await api.get("/home/");
    expect(response.config.headers["Accept-Language"]).toBe("ka");
  });
});
