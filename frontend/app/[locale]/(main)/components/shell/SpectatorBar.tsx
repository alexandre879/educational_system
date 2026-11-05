"use client";

import { useEffect, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { message } from "antd";
import { useTranslations } from "next-intl";

import api, { SPECTATOR_BLOCKED_EVENT } from "@/interceptors";
import { getRefreshToken } from "@/lib/auth";
import { startSpectating } from "@/lib/spectator";
import type { SpectatorInfo, SpectatorRole } from "../../profile/interface";
import { Segmented } from "./Segmented";
import styles from "./spectator.module.scss";

/** Shown in spectator sessions: says it's read-only, switches between roles, and leads out. */
export default function SpectatorBar({
  info,
  locale,
  onExit,
}: {
  info: SpectatorInfo;
  locale: string;
  onExit: () => void;
}) {
  const t = useTranslations("Spectator");
  const [messageApi, contextHolder] = message.useMessage();
  const [switching, setSwitching] = useState<SpectatorRole | null>(null);

  // The server refuses every change; say why instead of leaving only the page's own error.
  useEffect(() => {
    const onBlocked = () => messageApi.open({ key: "spectator-blocked", type: "info", content: t("blocked") });
    window.addEventListener(SPECTATOR_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(SPECTATOR_BLOCKED_EVENT, onBlocked);
  }, [messageApi, t]);

  const switchTo = async (role: SpectatorRole) => {
    if (role === info.viewing_as || switching) return;
    setSwitching(role);

    const previous = getRefreshToken();
    try {
      await startSpectating(role);
      // Revoke the session being replaced (best effort).
      if (previous) await api.post("/user/logout/", { refresh: previous }).catch(() => undefined);
      // A full reload, so no page keeps the previous person's data.
      window.location.assign(`/${locale}/home`);
    } catch {
      setSwitching(null);
      messageApi.error(t("switchFailed"));
    }
  };

  const roleLabel = (role: SpectatorRole) => t(`roles.${role}`);

  return (
    <div className={`${styles.bar} lg-rim`} role="region" aria-label={t("badge")}>
      {contextHolder}

      <span className={styles.badge}>
        <Eye size={17} />
        {t("badge")}
        <span className={styles.readOnly}>{t("readOnly")}</span>
      </span>

      <div className={styles.switcher}>
        <span className={styles.viewingAs}>{t("viewingAs")}</span>
        {info.roles.length > 1 ? (
          <Segmented
            options={info.roles.map((role) => ({ value: role, label: roleLabel(role) }))}
            value={switching ?? info.viewing_as}
            onChange={switchTo}
            label={t("viewingAs")}
          />
        ) : (
          <strong>{roleLabel(info.viewing_as)}</strong>
        )}
      </div>

      <button type="button" className={styles.exit} onClick={onExit}>
        <LogOut size={15} />
        {t("exit")}
      </button>
    </div>
  );
}
