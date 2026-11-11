"use client";

import { useSyncExternalStore } from "react";

import api from "@/interceptors";

/**
 * Notifications for the bell, the menu badges, the tab title, pop-ups and browser alerts. One
 * shared store: the layout polls the unread summary, and every surface reads from here.
 */

export type NotificationKind = "announcement" | "exercise" | "exam" | "mark" | "attendance";

export interface AppNotification {
  id: number;
  kind: NotificationKind | "";
  title: string;
  body: string;
  data: Record<string, unknown>;
  created_at: string;
  read: boolean;
}

interface Summary {
  unread: number;
  by_kind: Partial<Record<NotificationKind, number>>;
  latest_id: number;
}

interface State extends Summary {
  /** The latest page of notifications; null until the bell is first opened. */
  items: AppNotification[] | null;
}

const EMPTY: State = { unread: 0, by_kind: {}, latest_id: 0, items: null };
let state: State = EMPTY;
const listeners = new Set<() => void>();

function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNotifications(): State {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// ---------------------------------------------------------------- new arrivals

// -1 until the first poll, so notifications that already existed aren't announced as new.
let seenLatest = -1;
let onArrival: ((items: AppNotification[]) => void) | null = null;

/** Called with notifications that arrived since the last poll (for pop-ups and browser alerts). */
export function setArrivalHandler(handler: ((items: AppNotification[]) => void) | null) {
  onArrival = handler;
}

export async function loadNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<Summary & { results: AppNotification[] }>("/notifications/");
  update({ items: data.results, unread: data.unread, by_kind: data.by_kind, latest_id: data.latest_id });
  seenLatest = Math.max(seenLatest, data.latest_id);
  return data.results;
}

export async function refreshNotifications(): Promise<void> {
  const { data } = await api.get<Summary>("/notifications/unread/");
  const before = seenLatest;
  update({ unread: data.unread, by_kind: data.by_kind, latest_id: data.latest_id });
  if (before >= 0 && data.latest_id > before) {
    const items = await loadNotifications();
    const fresh = items.filter((item) => item.id > before && !item.read);
    if (fresh.length) onArrival?.(fresh);
  }
  seenLatest = Math.max(seenLatest, data.latest_id);
}

/** Forget everything (sign-out), so the next account doesn't see this one's badges. */
export function resetNotifications() {
  seenLatest = -1;
  update(EMPTY);
}

// ---------------------------------------------------------------- reading

type ReadRequest = { ids: number[] } | { kind: NotificationKind } | { all: true };

export async function markNotificationsRead(request: ReadRequest): Promise<void> {
  // Show it straight away; the server's answer then sets the exact counts.
  const hits = (item: AppNotification) =>
    "all" in request || ("kind" in request ? item.kind === request.kind : request.ids.includes(item.id));
  if (state.items) update({ items: state.items.map((item) => (hits(item) ? { ...item, read: true } : item)) });
  if ("all" in request) update({ unread: 0, by_kind: {} });
  else if ("kind" in request) {
    const removed = state.by_kind[request.kind] ?? 0;
    update({ unread: Math.max(0, state.unread - removed), by_kind: { ...state.by_kind, [request.kind]: 0 } });
  }

  const { data } = await api.post<Summary>("/notifications/read/", request);
  update({ unread: data.unread, by_kind: data.by_kind, latest_id: data.latest_id });
}

// ---------------------------------------------------------------- where each kind lives

/** Which page a notification opens (the same places the mobile app's push notifications open). */
export function notificationHref(item: Pick<AppNotification, "kind" | "data">, locale: string): string {
  switch (item.kind) {
    case "announcement":
      return item.data.id ? `/${locale}/announcement?openAnnouncement=${Number(item.data.id)}` : `/${locale}/announcement`;
    case "exercise":
      return `/${locale}/exercise`;
    case "exam":
      return `/${locale}/exam`;
    case "mark":
      return `/${locale}/marks`;
    default:
      return `/${locale}/home`;
  }
}

/**
 * Menu item → the kind of notification its badge counts. Attendance has no menu item of its own and
 * Home is where everyone lands, so those stay in the bell until they're opened or marked read.
 */
export const NAV_KIND: Record<string, NotificationKind> = {
  announcement: "announcement",
  exercises: "exercise",
  exams: "exam",
  marks: "mark",
};

/** First path segment after the locale → the kind that opening that page clears. */
export const SECTION_KIND: Record<string, NotificationKind> = {
  announcement: "announcement",
  exercise: "exercise",
  exam: "exam",
  marks: "mark",
};

export function formatCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
