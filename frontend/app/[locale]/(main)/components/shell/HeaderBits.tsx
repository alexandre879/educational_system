"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Timer, Wifi, WifiOff } from "lucide-react";

import { formatDay, formatTime, isoWeekday, weekdayName } from "@/lib/dates";
import { formatClock, remainingMs, useFocusTimer } from "@/lib/focusTimer";
import styles from "./shell.module.scss";

function appScroller(): HTMLElement | null {
  return document.getElementById("app-scroll");
}

/** Weekday, date and time; ticks on the minute. Rendered only on the client (no SSR mismatch). */
export function HeaderClock() {
  // The app's own month/weekday names: browsers' Intl data often lacks Georgian.
  const t = useTranslations("App");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      id = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    tick();
    return () => clearTimeout(id);
  }, []);

  if (!now) return null;

  return (
    <div className={styles.clock} aria-hidden="true">
      <span>
        {weekdayName(isoWeekday(now), t, true)}, {formatDay(now, t)}
      </span>
      <b>{formatTime(now)}</b>
    </div>
  );
}

/** A live countdown in the header while a focus session runs; opens the study dock. */
export function FocusChip({ onClick }: { onClick: () => void }) {
  const t = useTranslations("Glass.header");
  const focus = useFocusTimer();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!focus.running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [focus.running]);

  if (!focus.running) return null;
  const time = formatClock(remainingMs(focus, now));

  return (
    <button type="button" className={styles.focusChip} onClick={onClick} aria-label={t("focusRunning", { time })}>
      <span className={styles.focusDot} />
      <Timer size={15} />
      <span>{time}</span>
    </button>
  );
}

/** Shows when the browser goes offline, and briefly when the connection returns. */
export function ConnectionPill() {
  const t = useTranslations("Glass.header");
  const [status, setStatus] = useState<"online" | "offline" | "back">("online");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!navigator.onLine) setStatus("offline");

    const offline = () => {
      clearTimeout(timer);
      setStatus("offline");
    };
    const online = () => {
      setStatus("back");
      timer = setTimeout(() => setStatus("online"), 2800);
    };

    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  if (status === "online") return null;

  return (
    <div role="status" className={`${styles.connection} lg-rim`} data-status={status}>
      {status === "offline" ? <WifiOff size={16} /> : <Wifi size={16} />}
      {t(status === "offline" ? "offline" : "backOnline")}
    </div>
  );
}

/** Whether the page has scrolled past `threshold` px (re-checked when `watch` changes, e.g. the route). */
export function useAppScrolled(threshold: number, watch: string): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const scroller = appScroller();
    if (!scroller) return;
    const onScroll = () => setScrolled(scroller.scrollTop > threshold);
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [threshold, watch]);

  return scrolled;
}

/** A thin glowing line along the header's bottom edge that fills as the page scrolls. */
export function ScrollProgress({ watch }: { watch: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = appScroller();
    if (!scroller) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      barRef.current?.style.setProperty("--p", String(max > 4 ? scroller.scrollTop / max : 0));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);

    return () => {
      scroller.removeEventListener("scroll", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [watch]);

  return <div ref={barRef} className={styles.progress} aria-hidden="true" />;
}

export function BackToTop() {
  const t = useTranslations("Glass.header");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scroller = appScroller();
    if (!scroller) return;
    const onScroll = () => setVisible(scroller.scrollTop > 640);
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`${styles.toTop} lg-rim`}
      data-visible={visible}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => appScroller()?.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={15} />
      {t("toTop")}
    </button>
  );
}
