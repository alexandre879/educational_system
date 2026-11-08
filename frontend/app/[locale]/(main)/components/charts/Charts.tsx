"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import styles from "./charts.module.scss";

/** `label` is what the chart prints; `name` (if longer, e.g. a full weekday) is what the tooltip and table say. */
export type ChartDatum = { key: string; label: string; value: number; name?: string };

type Format = (value: number) => string;

/** Starts the grow-in once the chart scrolls into view (cards below the fold animate when seen). */
function useShown<T extends Element>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);

  return [ref, shown] as const;
}

/**
 * Hover and keyboard: one tab stop per chart, arrow keys move between marks, and the active mark
 * shows its tooltip. Marks are found by index so each chart decides where its tooltip points.
 */
function useActiveMark(count: number) {
  const [active, setActive] = useState<number | null>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!count) return;
      const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (event.key in step) {
        event.preventDefault();
        setActive((current) => (current == null ? 0 : (current + step[event.key] + count) % count));
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setActive(event.key === "Home" ? 0 : count - 1);
      } else if (event.key === "Escape") {
        setActive(null);
      }
    },
    [count]
  );

  const focusProps = {
    tabIndex: 0,
    onKeyDown,
    onFocus: () => setActive((current) => current ?? 0),
    onBlur: () => setActive(null),
  };

  return { active, setActive, focusProps };
}

type Anchor = { x: number; y: number; below: boolean };

/** Where the tooltip points: the top centre of a mark, kept on screen and clear of the header. */
function anchorFor(element: Element | null | undefined, atEnd = false): Anchor | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const half = 120;
  const x = Math.min(Math.max(atEnd ? rect.right : rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8);
  const below = rect.top < 140;
  return { x, y: below ? rect.bottom : rect.top, below };
}

function GlassTooltip({
  anchor,
  value,
  unit,
  label,
  context,
}: {
  anchor: Anchor | null;
  value: string;
  unit?: string;
  label: string;
  context?: boolean;
}) {
  // Cards use paint containment, so a fixed tooltip inside one would be clipped: render on <body>.
  if (!anchor || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={styles.tooltip}
      data-below={anchor.below}
      style={{ left: anchor.x, top: anchor.y }}
      role="status"
      aria-live="polite"
    >
      <span className={styles.tipValue}>
        <span className={styles.tipKey} data-context={context ? "true" : undefined} aria-hidden="true" />
        {value}
        {unit ? <span className={styles.tipUnit}>{unit}</span> : null}
      </span>
      <span className={styles.tipLabel}>{label}</span>
    </div>,
    document.body
  );
}

/** The tooltip follows its mark only while nothing scrolls; scrolling hides it. */
function useAnchor(active: number | null, find: (index: number) => Anchor | null) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    setAnchor(active == null ? null : find(active));
  }, [active, find]);

  useEffect(() => {
    if (active == null) return;
    const hide = () => setAnchor(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [active]);

  return anchor;
}

function SrTable({ title, unit, data, format }: { title: string; unit: string; data: ChartDatum[]; format: Format }) {
  return (
    <table className={styles.srOnly}>
      <caption>{title}</caption>
      <tbody>
        {data.map((datum) => (
          <tr key={datum.key}>
            <th scope="row">{datum.name ?? datum.label}</th>
            <td>
              {format(datum.value)} {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Ranked horizontal bars: one hue, largest first, the value in an aligned column beside the name.
 * For comparing magnitudes of named things (subjects, exams).
 */
export function BarList({
  title,
  unit,
  data,
  format,
}: {
  title: string;
  unit: string;
  data: ChartDatum[];
  format: Format;
}) {
  const [ref, shown] = useShown<HTMLDivElement>();
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const { active, setActive, focusProps } = useActiveMark(data.length);
  const max = Math.max(...data.map((datum) => datum.value), 0);
  const find = useCallback((index: number) => anchorFor(fills.current[index], true), []);
  const anchor = useAnchor(active, find);
  const current = active == null ? null : data[active];

  return (
    <div ref={ref} className={styles.chart} data-shown={shown} role="group" aria-label={title} {...focusProps}>
      <div className={styles.barList} aria-hidden="true">
        {data.map((datum, index) => (
          <div
            key={datum.key}
            className={styles.barRow}
            data-active={active === index}
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
          >
            <div className={styles.barMeta}>
              <span className={styles.barLabel} title={datum.label}>
                {datum.label}
              </span>
              <span className={styles.barValue}>{format(datum.value)}</span>
            </div>
            <div className={styles.barTrack}>
              <span
                ref={(node) => {
                  fills.current[index] = node;
                }}
                className={styles.barFill}
                style={{ "--v": max ? datum.value / max : 0, "--i": index } as CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
      <SrTable title={title} unit={unit} data={data} format={format} />
      {current ? <GlassTooltip anchor={anchor} value={format(current.value)} unit={unit} label={current.name ?? current.label} /> : null}
    </div>
  );
}

/** Round tick steps (1, 2, 5 × 10ⁿ) so the axis reads 0 / 2 / 4, never 0 / 1.67 / 3.33. */
export function niceTicks(max: number, target = 3): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  // Counts are whole numbers, so never a step below 1.
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= raw) ?? power * 10);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
}

/**
 * Columns over an ordered axis (days of the week). Emphasis, not colour per column: the marks the
 * story is about wear the accent and carry the only printed value; the rest are context gray.
 */
export function ColumnChart({
  title,
  unit,
  data,
  format,
  emphasis,
  caption,
}: {
  title: string;
  unit: string;
  data: ChartDatum[];
  format: Format;
  emphasis: (datum: ChartDatum) => boolean;
  caption?: ReactNode;
}) {
  const [ref, shown] = useShown<HTMLDivElement>();
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const { active, setActive, focusProps } = useActiveMark(data.length);
  const ticks = niceTicks(Math.max(...data.map((datum) => datum.value), 0));
  const top = ticks[ticks.length - 1] || 1;
  const find = useCallback((index: number) => anchorFor(bars.current[index]), []);
  const anchor = useAnchor(active, find);
  const current = active == null ? null : data[active];
  const n = { "--n": data.length } as CSSProperties;

  return (
    <div ref={ref} className={styles.chart} data-shown={shown} role="group" aria-label={title} {...focusProps}>
      <div className={styles.columns} aria-hidden="true">
        <div className={styles.plot}>
          {ticks.map((tick) => (
            <div key={tick} className={styles.gridline} style={{ bottom: `${(tick / top) * 100}%` }}>
              <span className={styles.tick}>{format(tick)}</span>
            </div>
          ))}
          <div className={styles.cols} style={n}>
            {data.map((datum, index) => {
              const emphasized = emphasis(datum) && datum.value > 0;
              return (
                <div
                  key={datum.key}
                  className={styles.col}
                  data-active={active === index}
                  data-emphasis={emphasized}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                >
                  <span
                    ref={(node) => {
                      bars.current[index] = node;
                    }}
                    className={styles.colBar}
                    style={{ "--v": datum.value / top, "--i": index } as CSSProperties}
                  >
                    {emphasized ? <span className={styles.colValue}>{format(datum.value)}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.xAxis} style={n}>
          {data.map((datum) => (
            <span key={datum.key} className={styles.xLabel} data-emphasis={emphasis(datum) && datum.value > 0}>
              {datum.label}
            </span>
          ))}
        </div>
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
      <SrTable title={title} unit={unit} data={data} format={format} />
      {current ? (
        <GlassTooltip
          anchor={anchor}
          value={format(current.value)}
          unit={unit}
          label={current.name ?? current.label}
          context={!(emphasis(current) && current.value > 0)}
        />
      ) : null}
    </div>
  );
}

/**
 * A meter for one ratio against its limit (done out of all): the unfilled track is a lighter step
 * of the same hue, and the percentage sits in the middle as the card's hero figure.
 */
export function ProgressRing({ percent, label, ariaLabel }: { percent: number; label: string; ariaLabel: string }) {
  const [ref, shown] = useShown<HTMLDivElement>();
  const gradient = useId();
  const value = Math.min(100, Math.max(0, percent));
  const radius = 52;
  const stroke = 11;
  const circumference = 2 * Math.PI * radius;

  return (
    <div ref={ref} className={styles.ring} role="img" aria-label={ariaLabel}>
      <svg className={styles.ringSvg} viewBox="0 0 128 128" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "color-mix(in oklab, var(--chart-1) 62%, white)" }} />
            <stop offset="100%" style={{ stopColor: "var(--chart-1)" }} />
          </linearGradient>
        </defs>
        <circle className={styles.ringTrack} cx="64" cy="64" r={radius} strokeWidth={stroke} />
        {value > 0 ? (
          <circle
            className={styles.ringFill}
            cx="64"
            cy="64"
            r={radius}
            strokeWidth={stroke}
            stroke={`url(#${gradient})`}
            strokeDasharray={circumference}
            strokeDashoffset={shown ? circumference * (1 - value / 100) : circumference}
          />
        ) : null}
      </svg>
      <div className={styles.ringCenter} aria-hidden="true">
        <span className={styles.ringValue}>{Math.round(value)}%</span>
        <span className={styles.ringLabel}>{label}</span>
      </div>
    </div>
  );
}
