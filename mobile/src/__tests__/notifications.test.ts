import type { AppNotification, NotificationSummary } from "@/api/types";
import {
  badgeLabel,
  itemHref,
  notificationHref,
  readItems,
  readSummary,
  sectionKind,
  tabBadges,
} from "@/notifications/inboxModel";

const item = (id: number, kind: AppNotification["kind"], read = false): AppNotification => ({
  id,
  kind,
  title: `#${id}`,
  body: "",
  data: { type: kind || undefined },
  created_at: "2026-11-11T10:00:00Z",
  read,
});

describe("notificationHref", () => {
  it("opens an announcement, at the comment when there is one", () => {
    expect(notificationHref({ type: "announcement", id: 7 })).toEqual({
      pathname: "/announcements/[id]",
      params: { id: "7" },
    });
    expect(notificationHref({ type: "announcement", id: 7, comment: 3 })).toEqual({
      pathname: "/announcements/[id]",
      params: { id: "7", comment: "3" },
    });
    expect(notificationHref({ type: "announcement" })).toBe("/announcements");
  });

  it("opens the other sections", () => {
    expect(notificationHref({ type: "exercise", date: "2026-11-11" })).toEqual({
      pathname: "/exercises",
      params: { date: "2026-11-11" },
    });
    expect(notificationHref({ type: "exam" })).toBe("/study");
    expect(notificationHref({ type: "mark" })).toBe("/more/marks");
    expect(notificationHref({ type: "attendance" })).toBe("/");
    expect(notificationHref({ type: "something-new" })).toBeNull();
  });

  it("falls back to the row's kind when the payload has no type", () => {
    expect(itemHref({ kind: "mark", data: {} })).toBe("/more/marks");
  });
});

describe("badges", () => {
  const byKind = { announcement: 2, exercise: 1, exam: 4, mark: 3 };

  it("puts exams on the second tab only for students, and marks under More", () => {
    expect(tabBadges(byKind, "student")).toEqual({ study: 4, exercises: 1, announcements: 2, more: 3 });
    expect(tabBadges(byKind, "parent")).toEqual({ study: 0, exercises: 1, announcements: 2, more: 3 });
    expect(tabBadges(byKind, "teacher").more).toBe(0);
  });

  it("clears a section when its screen opens", () => {
    expect(sectionKind("/announcements/12", "student")).toBe("announcement");
    expect(sectionKind("/exercises", "parent")).toBe("exercise");
    expect(sectionKind("/study", "student")).toBe("exam");
    expect(sectionKind("/study", "teacher")).toBeNull();
    expect(sectionKind("/more/marks", "parent")).toBe("mark");
    expect(sectionKind("/", "student")).toBeNull();
  });

  it("caps the label", () => {
    expect(badgeLabel(0)).toBeUndefined();
    expect(badgeLabel(7)).toBe("7");
    expect(badgeLabel(140)).toBe("99+");
  });
});

describe("reading", () => {
  const summary: NotificationSummary = { unread: 4, by_kind: { mark: 2, exam: 1, announcement: 1 }, latest_id: 4 };
  const items = [item(4, "mark"), item(3, "mark"), item(2, "exam"), item(1, "announcement"), item(0, "mark", true)];

  it("reads by id", () => {
    expect(readSummary(summary, { ids: [4, 0] }, items)).toEqual({
      unread: 3,
      by_kind: { mark: 1, exam: 1, announcement: 1 },
      latest_id: 4,
    });
    expect(readItems(items, { ids: [4] }).map((row) => row.read)).toEqual([true, false, false, false, true]);
  });

  it("reads a whole kind, or everything", () => {
    expect(readSummary(summary, { kind: "mark" })).toEqual({
      unread: 2,
      by_kind: { mark: 0, exam: 1, announcement: 1 },
      latest_id: 4,
    });
    expect(readSummary(summary, { all: true })).toEqual({ unread: 0, by_kind: {}, latest_id: 4 });
    expect(readItems(items, { all: true }).every((row) => row.read)).toBe(true);
  });
});
