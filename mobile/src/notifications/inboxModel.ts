import type { Href } from "expo-router";

import type { AppNotification, NotificationKind, NotificationReadRequest, NotificationSummary, Role } from "@/api/types";

/**
 * The in-app inbox's rules, kept free of React so they can be tested: where a notification
 * leads, which tab shows which badge, and what reading does to the counts.
 */

export type NotificationTarget = AppNotification["data"];

/** The screen a notification opens: the same for a tapped push and a row in the in-app list. */
export function notificationHref(data: NotificationTarget): Href | null {
  switch (data.type) {
    case "announcement":
      if (!data.id) return "/announcements";
      return {
        pathname: "/announcements/[id]",
        // Comment and reply notifications open the thread at that message.
        params: data.comment ? { id: String(data.id), comment: String(data.comment) } : { id: String(data.id) },
      };
    case "exercise":
      return { pathname: "/exercises", params: data.date ? { date: data.date } : {} };
    case "attendance":
      return "/";
    case "exam":
      return "/study";
    case "mark":
      return "/more/marks";
    default:
      return null;
  }
}

/** A row from the inbox: its saved push payload, with the kind as a fallback for the type. */
export function itemHref(item: Pick<AppNotification, "kind" | "data">): Href | null {
  return notificationHref({ ...item.data, type: item.data.type ?? item.kind });
}

/** Opening this screen clears that kind's badge (like social apps). */
export function sectionKind(pathname: string, role: Role | null): NotificationKind | null {
  if (pathname.startsWith("/announcements")) return "announcement";
  if (pathname.startsWith("/exercises")) return "exercise";
  // The second tab is Exams only for students (teachers: attendance, parents: schedule).
  if (pathname.startsWith("/study") && role === "student") return "exam";
  if (pathname.startsWith("/more/marks")) return "mark";
  return null;
}

export interface TabBadges {
  study: number;
  exercises: number;
  announcements: number;
  /** Marks live under More. */
  more: number;
}

export function tabBadges(byKind: NotificationSummary["by_kind"], role: Role | null): TabBadges {
  return {
    study: role === "student" ? (byKind.exam ?? 0) : 0,
    exercises: byKind.exercise ?? 0,
    announcements: byKind.announcement ?? 0,
    more: role === "teacher" ? 0 : (byKind.mark ?? 0),
  };
}

/** "3", "99+", or undefined for nothing (no badge). */
export function badgeLabel(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? "99+" : String(count);
}

function hits(item: AppNotification, request: NotificationReadRequest): boolean {
  if ("all" in request) return true;
  if ("kind" in request) return item.kind === request.kind;
  return request.ids.includes(item.id);
}

/** The list once `request` is read: shown straight away, before the server answers. */
export function readItems(items: AppNotification[], request: NotificationReadRequest): AppNotification[] {
  return items.map((item) => (!item.read && hits(item, request) ? { ...item, read: true } : item));
}

/** The counts once `request` is read (ids need the list to know their kinds). */
export function readSummary(
  summary: NotificationSummary,
  request: NotificationReadRequest,
  items: AppNotification[] = []
): NotificationSummary {
  if ("all" in request) return { ...summary, unread: 0, by_kind: {} };

  const byKind = { ...summary.by_kind };
  let removed = 0;
  if ("kind" in request) {
    removed = byKind[request.kind] ?? 0;
    byKind[request.kind] = 0;
  } else {
    for (const item of items) {
      if (item.read || !request.ids.includes(item.id) || !item.kind) continue;
      byKind[item.kind] = Math.max(0, (byKind[item.kind] ?? 0) - 1);
      removed += 1;
    }
  }
  return { ...summary, unread: Math.max(0, summary.unread - removed), by_kind: byKind };
}
