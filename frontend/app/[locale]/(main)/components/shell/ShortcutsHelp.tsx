"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { GlassDialog } from "./GlassDialog";
import type { NavItem } from "./navItems";
import { isMac } from "./useHotkeys";
import styles from "./panels.module.scss";

function Keys({ keys, then }: { keys: string[][]; then: string }) {
  return (
    <span className={styles.keys}>
      {keys.map((combo, index) => (
        <span key={combo.join("+")} className={styles.keys}>
          {index > 0 ? then : null}
          {combo.map((key) => (
            <kbd key={key}>{key}</kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

export default function ShortcutsHelp({
  open,
  onClose,
  navItems,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
}) {
  const t = useTranslations("Glass.shortcuts");
  const tStudy = useTranslations("Glass.study");
  const mod = isMac() ? "⌘" : "Ctrl";

  const general: { label: string; keys: string[][] }[] = [
    { label: t("palette"), keys: [[mod, "K"]] },
    { label: t("search"), keys: [["/"]] },
    { label: t("help"), keys: [["?"]] },
    { label: t("theme"), keys: [["⇧", "T"]] },
    { label: t("study"), keys: [["⇧", "F"]] },
    { label: t("sidebar"), keys: [["["]] },
  ];

  return (
    <GlassDialog open={open} onClose={onClose} label={t("title")} position="center">
      <div className={styles.dialogHeader}>
        <div className={styles.dialogTitle}>{t("title")}</div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label={tStudy("close")}>
          <X size={16} />
        </button>
      </div>

      <div className={styles.dialogBody}>
        <section className={styles.section}>
          <span className={styles.sectionLabel}>{t("general")}</span>
          <div className={styles.shortcutGrid}>
            {general.map((row) => (
              <div key={row.label} className={styles.shortcutRow}>
                {row.label}
                <Keys keys={row.keys} then={t("then")} />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>{t("navigation")}</span>
          <div className={styles.shortcutGrid}>
            {navItems.map((item) => (
              <div key={item.key} className={styles.shortcutRow}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <item.Icon size={15} style={{ color: "var(--primary-blue)" }} />
                  {item.label}
                </span>
                <Keys keys={[["G"], [item.hotkey.toUpperCase()]]} then={t("then")} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </GlassDialog>
  );
}
