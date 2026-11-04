"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Moon, Sun, SunMoon, X } from "lucide-react";

import {
  ACCENTS,
  type Accent,
  type Backdrop,
  type GlassLevel,
  type MotionPref,
  type ThemePref,
  resetAppearance,
  setAppearance,
  useAppearance,
} from "@/lib/appearance";
import { LANGUAGE_OPTIONS, pathForLocale } from "../../../components/LanguageSwitcher/LanguageSwitcher";
import { GlassDialog } from "./GlassDialog";
import { Segmented } from "./Segmented";
import styles from "./panels.module.scss";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <span className={styles.sectionLabel}>{label}</span>
      {children}
    </section>
  );
}

/** Theme, accent color, glass strength, background, motion and language, applied live. */
export default function AppearancePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Glass.appearance");
  const appearance = useAppearance();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <GlassDialog open={open} onClose={onClose} label={t("title")} position="center">
      <div className={styles.dialogHeader}>
        <div>
          <div className={styles.dialogTitle}>{t("title")}</div>
          <div className={styles.dialogSubtitle}>{t("subtitle")}</div>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t("done")}>
          <X size={16} />
        </button>
      </div>

      <div className={styles.dialogBody}>
        <Section label={t("theme")}>
          <Segmented<ThemePref>
            label={t("theme")}
            value={appearance.theme}
            onChange={(theme) => setAppearance({ theme })}
            options={[
              { value: "dark", label: t("dark"), icon: <Moon size={15} /> },
              { value: "light", label: t("light"), icon: <Sun size={15} /> },
              { value: "system", label: t("system"), icon: <SunMoon size={15} /> },
            ]}
          />
        </Section>

        <Section label={t("accent")}>
          <div className={styles.swatches} role="radiogroup" aria-label={t("accent")}>
            {(Object.keys(ACCENTS) as Accent[]).map((accent) => {
              const active = appearance.accent === accent;
              return (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${styles.swatch} ${active ? styles.swatchActive : ""}`}
                  onClick={() => setAppearance({ accent })}
                >
                  <span className={styles.swatchDot} style={{ background: ACCENTS[accent].swatch }} />
                  {t(`accents.${accent}`)}
                </button>
              );
            })}
          </div>
        </Section>

        <Section label={t("glass")}>
          <Segmented<GlassLevel>
            label={t("glass")}
            value={appearance.glass}
            onChange={(glass) => setAppearance({ glass })}
            options={[
              { value: "clear", label: t("clear") },
              { value: "regular", label: t("regular") },
              { value: "frosted", label: t("frosted") },
            ]}
          />
        </Section>

        <Section label={t("backdrop")}>
          <Segmented<Backdrop>
            label={t("backdrop")}
            value={appearance.backdrop}
            onChange={(backdrop) => setAppearance({ backdrop })}
            options={[
              { value: "aurora", label: t("aurora") },
              { value: "mesh", label: t("mesh") },
              { value: "minimal", label: t("minimal") },
            ]}
          />
        </Section>

        <Section label={t("motion")}>
          <Segmented<MotionPref>
            label={t("motion")}
            value={appearance.motion}
            onChange={(motion) => setAppearance({ motion })}
            options={[
              { value: "system", label: t("system") },
              { value: "full", label: t("motionFull") },
              { value: "reduced", label: t("motionReduced") },
            ]}
          />
        </Section>

        <Section label={t("language")}>
          <div className={styles.languages}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={option.value === locale}
                className={`${styles.languageButton} ${option.value === locale ? styles.languageActive : ""}`}
                onClick={() => option.value !== locale && router.push(pathForLocale(pathname, option.value))}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className={styles.dialogFooter}>
        <button type="button" className={styles.textButton} onClick={resetAppearance}>
          {t("reset")}
        </button>
        <button type="button" className={styles.primaryButton} onClick={onClose}>
          {t("done")}
        </button>
      </div>
    </GlassDialog>
  );
}
