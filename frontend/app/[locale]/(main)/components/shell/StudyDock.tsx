"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AudioLines,
  Check,
  CloudRain,
  Copy,
  Flame,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  StickyNote,
  Timer,
  Trash2,
  Volume1,
  Volume2,
  Waves,
  Wind,
  X,
} from "lucide-react";

import { type Ambience, playAmbience, playChime, setAmbienceVolume, unlockAudio, useAmbience } from "@/lib/ambientSound";
import { type FocusPhase, focusTimer, formatClock, remainingMs, useFocusTimer } from "@/lib/focusTimer";
import Confetti from "../ui/Confetti";
import { Segmented } from "./Segmented";
import styles from "./study.module.scss";

type Tab = "focus" | "sounds" | "notes";

const NOTES_KEY = "quickNotes";
const RING_RADIUS = 86;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function useNow(interval: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!interval) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  } catch {
    // Notifications unavailable (e.g. iOS Safari outside a home-screen app).
  }
}

/** Animated bars shown while a background sound plays. */
function Equalizer({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.equalizer} ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * A floating study companion: a Pomodoro focus timer, generated background sounds and quick
 * notes. It stays mounted across pages so the timer and sound keep going while you browse.
 */
export default function StudyDock({
  open,
  onOpenChange,
  hidden = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidden?: boolean;
}) {
  const t = useTranslations("Glass.study");
  const focus = useFocusTimer();
  const ambience = useAmbience();
  const [tab, setTab] = useState<Tab>("focus");
  const [celebration, setCelebration] = useState(0);
  const now = useNow(focus.running ? 1000 : null);
  const tRef = useRef(t);
  tRef.current = t;

  const left = remainingMs(focus, now);
  const total = focus.minutes[focus.phase] * 60_000;
  const progress = Math.max(0, Math.min(1, 1 - left / total));
  const inProgress = focus.running || left < total;
  const phaseLabel = t(focus.phase);

  // Finish the phase exactly when it ends: chime, notify, and celebrate a finished focus block.
  useEffect(() => {
    if (!focus.running || !focus.endsAt) return;
    const finishing = focus.phase;
    const timer = setTimeout(
      () => {
        focusTimer.complete();
        playChime();
        const message = finishing === "focus" ? tRef.current("focusDone") : tRef.current("breakDone");
        notify(tRef.current("title"), message);
        if (finishing === "focus") setCelebration((count) => count + 1);
      },
      Math.max(0, focus.endsAt - Date.now())
    );
    return () => clearTimeout(timer);
  }, [focus.running, focus.endsAt, focus.phase]);

  // The countdown in the tab title, so it's visible from other tabs.
  useEffect(() => {
    if (!focus.running) return;
    const base = document.title;
    const label = tRef.current(focus.phase);
    const update = () => {
      document.title = `${formatClock(remainingMs(focusTimer.get()))} · ${label} — ${base}`;
    };
    update();
    const id = setInterval(update, 1000);
    return () => {
      clearInterval(id);
      document.title = base;
    };
  }, [focus.running, focus.phase]);

  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(() => setCelebration(0), 4200);
    return () => clearTimeout(id);
  }, [celebration]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const start = () => {
    unlockAudio();
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    focusTimer.start();
  };

  const ringStyle = { "--progress": progress } as CSSProperties;

  return (
    <>
      {celebration ? <Confetti key={celebration} count={70} /> : null}

      <div className={styles.dock} data-hidden={hidden}>
        {open ? (
          <section className={`${styles.panel} lg-rim`} aria-label={t("title")}>
            <header className={styles.panelHeader}>
              <span className={styles.panelTitle}>{t("title")}</span>
              <button type="button" className={styles.iconButton} onClick={() => onOpenChange(false)} aria-label={t("close")}>
                <X size={16} />
              </button>
            </header>

            <Segmented<Tab>
              label={t("title")}
              value={tab}
              onChange={setTab}
              options={[
                { value: "focus", label: t("tabFocus"), icon: <Timer size={14} /> },
                { value: "sounds", label: t("tabSounds"), icon: <AudioLines size={14} /> },
                { value: "notes", label: t("tabNotes"), icon: <StickyNote size={14} /> },
              ]}
            />

            {tab === "focus" ? (
              <div className={styles.focus}>
                <Segmented<FocusPhase>
                  label={t("tabFocus")}
                  value={focus.phase}
                  onChange={(phase) => focusTimer.setPhase(phase)}
                  options={[
                    { value: "focus", label: t("focus") },
                    { value: "short", label: t("short") },
                    { value: "long", label: t("long") },
                  ]}
                />

                <div className={styles.ring} style={ringStyle} data-phase={focus.phase} data-running={focus.running}>
                  <svg viewBox="0 0 200 200" aria-hidden="true">
                    <defs>
                      <linearGradient id="study-ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" style={{ stopColor: "var(--ring-from)" }} />
                        <stop offset="100%" style={{ stopColor: "var(--ring-to)" }} />
                      </linearGradient>
                    </defs>
                    <circle className={styles.ringTrack} cx="100" cy="100" r={RING_RADIUS} />
                    <circle
                      className={styles.ringValue}
                      cx="100"
                      cy="100"
                      r={RING_RADIUS}
                      stroke="url(#study-ring)"
                      strokeDasharray={RING_LENGTH}
                      strokeDashoffset={RING_LENGTH * (1 - progress)}
                    />
                  </svg>
                  <div className={styles.ringCenter}>
                    <span className={styles.ringTime} role="timer" aria-live="off">
                      {formatClock(left)}
                    </span>
                    <span className={styles.ringLabel}>{phaseLabel}</span>
                    <span className={styles.rounds} aria-hidden="true">
                      {[0, 1, 2, 3].map((index) => (
                        <i key={index} data-done={index < focus.round} />
                      ))}
                    </span>
                  </div>
                </div>

                <div className={styles.controls}>
                  <button type="button" className={styles.iconButton} onClick={focusTimer.reset} aria-label={t("reset")} title={t("reset")}>
                    <RotateCcw size={17} />
                  </button>
                  <button
                    type="button"
                    className={styles.playButton}
                    onClick={focus.running ? focusTimer.pause : start}
                    data-running={focus.running}
                  >
                    {focus.running ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    {focus.running ? t("pause") : inProgress ? t("resume") : t("start")}
                  </button>
                  <button type="button" className={styles.iconButton} onClick={focusTimer.skip} aria-label={t("skip")} title={t("skip")}>
                    <SkipForward size={17} />
                  </button>
                </div>

                <div className={styles.stepper}>
                  <button
                    type="button"
                    onClick={() => focusTimer.setMinutes(focus.phase, focus.minutes[focus.phase] - 1)}
                    disabled={focus.running || focus.minutes[focus.phase] <= 1}
                    aria-label={t("less")}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{t("minutes", { count: focus.minutes[focus.phase] })}</span>
                  <button
                    type="button"
                    onClick={() => focusTimer.setMinutes(focus.phase, focus.minutes[focus.phase] + 1)}
                    disabled={focus.running || focus.minutes[focus.phase] >= 120}
                    aria-label={t("more")}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className={styles.sessions}>
                  <Flame size={14} />
                  {t("sessionsToday", { count: focus.completed })}
                </div>
              </div>
            ) : null}

            {tab === "sounds" ? <SoundsTab current={ambience.kind} volume={ambience.volume} /> : null}
            {tab === "notes" ? <NotesTab /> : null}
          </section>
        ) : null}

        <button
          type="button"
          className={`${styles.orb} lg-rim`}
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-label={t("open")}
          data-active={inProgress}
          style={ringStyle}
        >
          {inProgress ? (
            <>
              <svg className={styles.orbRing} viewBox="0 0 60 60" aria-hidden="true">
                <circle cx="30" cy="30" r="26" pathLength={100} />
                <circle cx="30" cy="30" r="26" pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - progress)} />
              </svg>
              <span className={styles.orbTime}>{formatClock(left)}</span>
            </>
          ) : (
            <Timer size={22} />
          )}
          {ambience.kind !== "off" ? <Equalizer className={styles.orbEqualizer} /> : null}
        </button>
      </div>
    </>
  );
}

const SOUNDS: { kind: Exclude<Ambience, "off">; Icon: typeof Wind }[] = [
  { kind: "brown", Icon: Wind },
  { kind: "rain", Icon: CloudRain },
  { kind: "white", Icon: AudioLines },
  { kind: "waves", Icon: Waves },
];

function SoundsTab({ current, volume }: { current: Ambience; volume: number }) {
  const t = useTranslations("Glass.study");

  return (
    <div className={styles.sounds}>
      <div className={styles.soundGrid}>
        {SOUNDS.map(({ kind, Icon }) => {
          const active = current === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={active}
              className={`${styles.soundTile} ${active ? styles.soundActive : ""}`}
              onClick={() => playAmbience(active ? "off" : kind)}
            >
              <span className={styles.soundIcon}>
                <Icon size={20} />
              </span>
              <span>{t(`sounds.${kind}`)}</span>
              {active ? <Equalizer className={styles.soundEqualizer} /> : null}
            </button>
          );
        })}
      </div>

      <label className={styles.volume}>
        <span className={styles.srOnly}>{t("volume")}</span>
        <Volume1 size={16} aria-hidden="true" />
        <input
          type="range"
          min={0.02}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => setAmbienceVolume(Number(event.target.value))}
          style={{ "--fill": `${volume * 100}%` } as CSSProperties}
        />
        <Volume2 size={16} aria-hidden="true" />
      </label>

      <p className={styles.hint}>{t("soundsHint")}</p>
    </div>
  );
}

function NotesTab() {
  const t = useTranslations("Glass.study");
  const [text, setText] = useState(() => {
    try {
      return window.localStorage.getItem(NOTES_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [copied, setCopied] = useState(false);

  const update = (value: string) => {
    setText(value);
    try {
      window.localStorage.setItem(NOTES_KEY, value);
    } catch {
      // Notes stay in the field for now.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked.
    }
  };

  return (
    <div className={styles.notes}>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(event) => update(event.target.value)}
        placeholder={t("notesPlaceholder")}
        aria-label={t("tabNotes")}
        autoFocus
      />
      <div className={styles.notesFooter}>
        <span className={styles.saved}>
          <Check size={13} /> {t("notesSaved")} · {t("characters", { count: text.length })}
        </span>
        <span className={styles.notesActions}>
          <button type="button" className={styles.iconButton} onClick={copy} disabled={!text} aria-label={t("copy")} title={copied ? t("copied") : t("copy")}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button type="button" className={styles.iconButton} onClick={() => update("")} disabled={!text} aria-label={t("clear")} title={t("clear")}>
            <Trash2 size={15} />
          </button>
        </span>
      </div>
    </div>
  );
}
