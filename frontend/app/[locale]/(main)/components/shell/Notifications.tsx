"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Popover } from "antd";
import {
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  ClipboardCheck,
  Megaphone,
  NotebookPen,
  ScrollText,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { NotifyCorner } from "@/lib/appearance";
import { formatRelative } from "@/lib/dates";
import {
  formatCount,
  loadNotifications,
  markNotificationsRead,
  notificationHref,
  refreshNotifications,
  SECTION_KIND,
  setArrivalHandler,
  useNotifications,
  type AppNotification,
} from "@/lib/notifications";
import styles from "./notifications.module.scss";

const KINDS: Record<string, { Icon: LucideIcon; color: string }> = {
  announcement: { Icon: Megaphone, color: "#8B5CF6" },
  exercise: { Icon: NotebookPen, color: "#14B8A6" },
  exam: { Icon: ScrollText, color: "#F97316" },
  mark: { Icon: Star, color: "#F59E0B" },
  attendance: { Icon: ClipboardCheck, color: "#22C55E" },
};
const FALLBACK_KIND = { Icon: Bell, color: "#3B82F6" };

function KindIcon({ kind, size = 17 }: { kind: string; size?: number }) {
  const { Icon, color } = KINDS[kind] ?? FALLBACK_KIND;
  return (
    <span className={styles.kindIcon} style={{ "--c": color } as CSSProperties} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}

// ---------------------------------------------------------------- browser (desktop) alerts

const ALERTS_KEY = "notify.desktop";
type AlertState = "unsupported" | "blocked" | "on" | "off";

function alertState(): AlertState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  let wanted = false;
  try {
    wanted = window.localStorage.getItem(ALERTS_KEY) === "on";
  } catch {
    // storage blocked: treat as off
  }
  return Notification.permission === "granted" && wanted ? "on" : "off";
}

function setAlertsWanted(on: boolean) {
  try {
    window.localStorage.setItem(ALERTS_KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the choice lasts for this page only
  }
}

// ---------------------------------------------------------------- runtime (in the layout)

/**
 * Keeps the unread summary fresh (every 30 s, and when the tab comes back), shows new notifications as
 * pop-ups (or browser alerts when the tab is in the background), puts the count in the tab title, and
 * clears a section's badge when its page is opened.
 */
export function useNotificationRuntime({
  enabled,
  canMark,
  locale,
  pathname,
}: {
  enabled: boolean;
  /** False for spectators: they may look, but reading would change someone else's inbox. */
  canMark: boolean;
  locale: string;
  pathname: string;
}) {
  const router = useRouter();
  const { unread, by_kind } = useNotifications();
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const open = useCallback(
    (item: AppNotification) => {
      if (canMark && !item.read) markNotificationsRead({ ids: [item.id] }).catch(() => undefined);
      setToasts((current) => current.filter((toast) => toast.id !== item.id));
      router.push(notificationHref(item, locale));
    },
    [canMark, locale, router]
  );

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Background tabs only need polling when they can raise a browser alert.
    const tick = () => {
      if (document.visibilityState === "visible" || alertState() === "on") {
        refreshNotifications().catch(() => undefined);
      }
    };
    tick();
    const timer = setInterval(tick, 30_000);
    const onBack = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    setArrivalHandler((items) => {
      if (document.visibilityState === "visible") {
        setToasts((current) => [...items.slice(0, 3), ...current].slice(0, 3));
      } else if (alertState() === "on") {
        for (const item of items.slice(0, 3)) {
          const alert = new Notification(item.title, { body: item.body, tag: `school-${item.id}`, icon: "/apple-icon.png" });
          alert.onclick = () => {
            window.focus();
            open(item);
            alert.close();
          };
        }
      }
    });
    return () => setArrivalHandler(null);
  }, [enabled, open]);

  // "(3) My School" in the browser tab. Next.js sets the title on navigation, so keep re-adding it.
  useEffect(() => {
    const strip = (title: string) => title.replace(/^\(\d+\+?\) /, "");
    const apply = () => {
      const base = strip(document.title);
      const wanted = unread > 0 ? `(${formatCount(unread)}) ${base}` : base;
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = strip(document.title);
    };
  }, [unread]);

  // Opening a section (announcements, exercises, exams, marks) clears its badge, like social apps.
  useEffect(() => {
    if (!enabled || !canMark) return;
    const kind = SECTION_KIND[pathname.split("/")[2] ?? ""];
    if (kind && (by_kind[kind] ?? 0) > 0) markNotificationsRead({ kind }).catch(() => undefined);
  }, [enabled, canMark, pathname, by_kind]);

  return { toasts, open, dismiss };
}

// ---------------------------------------------------------------- the bell

function NotificationPanel({
  canMark,
  onOpen,
}: {
  canMark: boolean;
  onOpen: (item: AppNotification) => void;
}) {
  const t = useTranslations("Glass.notifications");
  const tApp = useTranslations("App");
  const { items, unread } = useNotifications();
  const [alerts, setAlerts] = useState<AlertState>(alertState);
  const [now] = useState(() => new Date());

  const turnAlertsOn = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") setAlertsWanted(true);
    setAlerts(alertState());
  };

  return (
    <div className={styles.panel} role="dialog" aria-label={t("title")}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>
          {t("title")}
          {unread > 0 ? <span className={styles.panelCount}>{t("unreadCount", { count: unread })}</span> : null}
        </span>
        {canMark && unread > 0 ? (
          <button type="button" className={styles.textButton} onClick={() => markNotificationsRead({ all: true }).catch(() => undefined)}>
            <CheckCheck size={15} />
            {t("markAll")}
          </button>
        ) : null}
      </div>

      {alerts === "off" ? (
        <div className={styles.alertsRow}>
          <BellRing size={16} />
          <span>{t("alertsPrompt")}</span>
          <button type="button" className={styles.alertsButton} onClick={turnAlertsOn}>
            {t("alertsTurnOn")}
          </button>
        </div>
      ) : alerts === "on" ? (
        <div className={styles.alertsRow} data-quiet="true">
          <BellRing size={15} />
          <span>{t("alertsOn")}</span>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setAlertsWanted(false);
              setAlerts(alertState());
            }}
          >
            {t("alertsTurnOff")}
          </button>
        </div>
      ) : alerts === "blocked" ? (
        <div className={styles.alertsRow} data-quiet="true">
          <BellOff size={15} />
          <span>{t("alertsBlocked")}</span>
        </div>
      ) : null}

      <div className={styles.list}>
        {items === null ? (
          <div className={styles.loading} aria-busy="true">
            <span />
            <span />
            <span />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <BellOff size={26} />
            <span>{t("empty")}</span>
          </div>
        ) : (
          items.map((item) => (
            <button key={item.id} type="button" className={styles.item} data-unread={!item.read} onClick={() => onOpen(item)}>
              <KindIcon kind={item.kind} />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>{item.title}</span>
                {item.body ? <span className={styles.itemBody}>{item.body}</span> : null}
                <span className={styles.itemTime}>{formatRelative(item.created_at, tApp, now)}</span>
              </span>
              {!item.read ? <span className={styles.unreadDot} aria-label={t("unread")} /> : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function NotificationBell({ canMark, onOpen }: { canMark: boolean; onOpen: (item: AppNotification) => void }) {
  const t = useTranslations("Glass.notifications");
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) loadNotifications().catch(() => undefined);
      }}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      destroyOnHidden
      classNames={{ root: styles.popover }}
      styles={{ body: { padding: 0, background: "transparent", boxShadow: "none" } }}
      content={
        <NotificationPanel
          canMark={canMark}
          onOpen={(item) => {
            setOpen(false);
            onOpen(item);
          }}
        />
      }
    >
      <button
        type="button"
        className={styles.bell}
        data-ringing={unread > 0}
        aria-label={unread > 0 ? `${t("title")}, ${t("unreadCount", { count: unread })}` : t("title")}
      >
        <Bell size={19} />
        {unread > 0 ? <span className={styles.bellBadge}>{formatCount(unread)}</span> : null}
      </button>
    </Popover>
  );
}

// ---------------------------------------------------------------- pop-ups

function Toast({
  item,
  onOpen,
  onDismiss,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
  onDismiss: (id: number) => void;
}) {
  const t = useTranslations("Glass.notifications");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(item.id), 7000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss, paused]);

  return (
    <div className={styles.toast} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <button type="button" className={styles.toastMain} onClick={() => onOpen(item)}>
        <KindIcon kind={item.kind} size={18} />
        <span className={styles.itemText}>
          <span className={styles.itemTitle}>{item.title}</span>
          {item.body ? <span className={styles.itemBody}>{item.body}</span> : null}
        </span>
      </button>
      <button type="button" className={styles.toastClose} onClick={() => onDismiss(item.id)} aria-label={t("dismiss")}>
        <X size={15} />
      </button>
    </div>
  );
}

/** New notifications slide in from the corner chosen in Appearance. */
export function NotificationToasts({
  toasts,
  corner,
  onOpen,
  onDismiss,
}: {
  toasts: AppNotification[];
  corner: NotifyCorner;
  onOpen: (item: AppNotification) => void;
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className={styles.toasts} data-corner={corner} role="status" aria-live="polite">
      {toasts.map((item) => (
        <Toast key={item.id} item={item} onOpen={onOpen} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
