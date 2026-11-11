"use client";

import { type CSSProperties, useRef } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { useLiquidLens } from "@/lib/liquidLens";
import { formatCount } from "@/lib/notifications";
import type { NavItem } from "./navItems";
import styles from "./shell.module.scss";

/**
 * The phone tab bar: a floating glass capsule whose selection lens slides between tabs.
 * Two lenses travel at different speeds, so the selection stretches like a drop of liquid.
 */
export default function MobileDock({
  items,
  activeKey,
  moreLabel,
  moreActive,
  onMore,
  moreBadge = 0,
  label,
}: {
  items: NavItem[];
  activeKey: string | null;
  moreLabel: string;
  moreActive: boolean;
  onMore: () => void;
  /** Unread notifications in sections that only live behind "More" (shown as a dot). */
  moreBadge?: number;
  label: string;
}) {
  const dockRef = useRef<HTMLElement>(null);
  useLiquidLens(dockRef, { bezel: 20, scale: 56 });

  const itemIndex = items.findIndex((item) => item.key === activeKey);
  const index = itemIndex >= 0 ? itemIndex : moreActive ? items.length : -1;

  return (
    <nav
      ref={dockRef}
      className={`${styles.dock} lg-rim`}
      aria-label={label}
      style={{ "--n": items.length + 1, "--i": Math.max(0, index) } as CSSProperties}
    >
      <span className={styles.dockTrail} data-visible={index >= 0} aria-hidden="true" />
      <span className={styles.dockLens} data-visible={index >= 0} aria-hidden="true" />

      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`${styles.dockItem} ${active ? styles.dockItemActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.dockIconWrap}>
              <item.Icon size={21} strokeWidth={active ? 2.3 : 2} />
              {item.badge ? <span className={styles.dockBadge}>{formatCount(item.badge)}</span> : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        className={`${styles.dockItem} ${moreActive ? styles.dockItemActive : ""}`}
        onClick={onMore}
      >
        <span className={styles.dockIconWrap}>
          <LayoutGrid size={21} />
          {moreBadge ? <span className={styles.dockBadge} /> : null}
        </span>
        <span>{moreLabel}</span>
      </button>
    </nav>
  );
}
