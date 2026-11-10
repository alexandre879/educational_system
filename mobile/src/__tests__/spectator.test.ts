import { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { isSpectatorBlocked } from "@/api/client";
import { actionErrorMessage, errorMessage } from "@/components/States";
import type { Translate } from "@/i18n";

function httpError(status: number, data: unknown) {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError(`HTTP ${status}`, "ERR_BAD_REQUEST", config, null, {
    status,
    statusText: String(status),
    data,
    headers: {},
    config,
  });
}

const t = ((key: string) => key) as Translate;

describe("spectator refusals", () => {
  const blocked = httpError(403, { detail: "Spectators can only look around.", code: "spectator_read_only" });
  const forbidden = httpError(403, { detail: "You do not have permission." });

  it("tells a spectator refusal apart from an ordinary 403", () => {
    expect(isSpectatorBlocked(blocked)).toBe(true);
    expect(isSpectatorBlocked(forbidden)).toBe(false);
    expect(isSpectatorBlocked(new Error("boom"))).toBe(false);
  });

  it("explains it instead of the generic messages", () => {
    expect(actionErrorMessage(blocked, t, "announcements.postFailed")).toBe("spectator.blocked");
    expect(errorMessage(blocked, t)).toBe("spectator.blocked");
    expect(actionErrorMessage(forbidden, t, "announcements.postFailed")).toBe("common.forbidden");
  });
});
