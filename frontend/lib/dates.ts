/** Date helpers shared with the mobile app; labels come from the `App.dates` messages. */

export type Translate = (key: string, values?: Record<string, string | number>) => string;
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` in local time (toISOString() would give the UTC date). */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse `YYYY-MM-DD` as a local calendar date (not UTC midnight). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** 1 = Monday … 7 = Sunday, matching the API's weekday numbers. */
export function isoWeekday(date: Date): IsoWeekday {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as IsoWeekday;
}

export function weekdayName(weekday: IsoWeekday, t: Translate, short = false): string {
  return t(short ? `dates.weekdaysShort.d${weekday}` : `dates.weekdaysLong.d${weekday}`);
}

/** "12 Oct" */
export function formatDay(value: Date | string, t: Translate): string {
  const date = typeof value === "string" ? (value.length === 10 ? parseISODate(value) : new Date(value)) : value;
  return `${date.getDate()} ${t(`dates.months.m${date.getMonth() + 1}`)}`;
}

/** "October 2026" */
export function formatMonth(date: Date, t: Translate): string {
  return `${t(`dates.monthsLong.m${date.getMonth() + 1}`)} ${date.getFullYear()}`;
}

/** `YYYY-MM` */
export function toISOMonth(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** First day of the month `months` away from `date`'s month. */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** The month as weeks of seven days (Monday first), padded with the neighbouring months' days. */
export function monthGrid(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  let day = addDays(first, 1 - isoWeekday(first));
  const weeks: Date[][] = [];
  while (day <= last) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** "14:05" */
export function formatTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", then the date. */
export function formatRelative(value: string, t: Translate, now: Date = new Date()): string {
  const date = new Date(value);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return t("time.justNow");
  if (minutes < 60) return t("time.minutesAgo", { count: minutes });
  if (toISODate(date) === toISODate(now)) return t("time.hoursAgo", { count: Math.floor(minutes / 60) });
  if (toISODate(date) === toISODate(addDays(now, -1))) return t("time.yesterday");
  return formatDay(date, t);
}
