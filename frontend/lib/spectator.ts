import axios from "axios";

import { API_BASE_URL } from "@/interceptors";
import { setTokens } from "@/lib/auth";
import type { SpectatorRole } from "@/app/[locale]/(main)/profile/interface";

export { SPECTATOR_BLOCKED_EVENT } from "@/interceptors";

/** Signs in read-only as the spectator account, viewing the site as `role` (default: the first set up). */
export async function startSpectating(role?: SpectatorRole): Promise<void> {
  const { data } = await axios.post<{ access: string; refresh: string }>(
    `${API_BASE_URL}/spectator/login/`,
    role ? { role } : {}
  );
  setTokens(data.access, data.refresh);
}
