import { translate, type Translate } from "@/i18n";
import {
  addDays,
  addMonths,
  formatCountdown,
  formatDay,
  formatMonth,
  formatRelative,
  greetingKey,
  isoWeekday,
  monthGrid,
  parseISODate,
  toISODate,
  toISOMonth,
} from "@/lib/dates";
import { localize } from "@/lib/localize";

const t: Translate = (key, params) => translate("en", key, params);

describe("dates", () => {
  it("lays a month out in Monday-first weeks", () => {
    const weeks = monthGrid(new Date(2026, 9, 15)); // October 2026 starts on a Thursday
    expect(weeks).toHaveLength(5);
    expect(toISODate(weeks[0][0])).toBe("2026-09-28");
    expect(toISODate(weeks[4][6])).toBe("2026-11-01");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("steps and names months", () => {
    expect(toISOMonth(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02");
    expect(toISOMonth(addMonths(new Date(2026, 0, 15), -1))).toBe("2025-12");
    expect(formatMonth(new Date(2026, 9, 5), t)).toBe("October 2026");
  });

  it("describes how long ago something was posted", () => {
    const now = new Date(2026, 9, 5, 15, 0);
    const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
    expect(formatRelative(ago(0), t, now)).toBe("Just now");
    expect(formatRelative(ago(5), t, now)).toBe("5 min ago");
    expect(formatRelative(ago(180), t, now)).toBe("3 h ago");
    expect(formatRelative(new Date(2026, 9, 4, 20, 0).toISOString(), t, now)).toBe("Yesterday");
    expect(formatRelative(new Date(2026, 8, 20, 9, 0).toISOString(), t, now)).toBe(formatDay(new Date(2026, 8, 20, 9, 0), t));
  });

  it("greets by time of day", () => {
    expect(greetingKey(new Date(2026, 9, 5, 8))).toBe("home.goodMorning");
    expect(greetingKey(new Date(2026, 9, 5, 13))).toBe("home.goodAfternoon");
    expect(greetingKey(new Date(2026, 9, 5, 21))).toBe("home.goodEvening");
  });

  it("round-trips local calendar dates", () => {
    const date = new Date(2026, 0, 31, 23, 30); // late evening must stay on the same day
    expect(toISODate(date)).toBe("2026-01-31");
    expect(toISODate(parseISODate("2026-01-31"))).toBe("2026-01-31");
  });

  it("adds days across month boundaries", () => {
    expect(toISODate(addDays(parseISODate("2026-01-31"), 1))).toBe("2026-02-01");
  });

  it("numbers weekdays like the API (Monday = 1, Sunday = 7)", () => {
    expect(isoWeekday(parseISODate("2026-10-05"))).toBe(1);
    expect(isoWeekday(parseISODate("2026-10-04"))).toBe(7);
  });

  it("formats days and countdowns", () => {
    expect(formatDay("2026-10-04", t)).toBe("4 Oct");
    expect(formatCountdown(65_000)).toBe("01:05");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});

describe("localize", () => {
  it("picks the requested language, then falls back", () => {
    expect(localize({ en: "Math", ka: "მათემატიკა" }, "ka")).toBe("მათემატიკა");
    expect(localize({ en: "Math", ka: "მათემატიკა" }, "ru")).toBe("მათემატიკა");
    expect(localize("plain", "en")).toBe("plain");
    expect(localize(null, "en")).toBe("");
  });
});
