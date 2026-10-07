"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { reportError } from "@/lib/sentry";
import ui from "./components/ui/ui.module.scss";

/** A page crashed: report it and offer a retry instead of a blank screen. */
export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("App.common");

  useEffect(() => {
    console.error(error);
    reportError(error);
  }, [error]);

  return (
    <div className={ui.page}>
      <div className={`${ui.empty} ${ui.error}`}>
        <div className={ui.emptyTitle}>{t("errorTitle")}</div>
        <div>{t("genericError")}</div>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={reset}>
          {t("retry")}
        </button>
      </div>
    </div>
  );
}
