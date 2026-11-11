import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import { useEffect } from "react";

import { fetchNotifications, fetchNotificationSummary, markNotificationsRead } from "@/api/endpoints";
import type { AppNotification, NotificationReadRequest, NotificationSummary } from "@/api/types";
import { useCurrentUser } from "@/auth/AuthProvider";

import { readItems, readSummary, sectionKind, tabBadges, type TabBadges } from "./inboxModel";

/**
 * The in-app inbox: the bell's count, the tab badges and the notifications list. Every push the
 * server sends is saved here too, so phones without push (Expo Go, the web build) still see them.
 */

const EMPTY: NotificationSummary = { unread: 0, by_kind: {}, latest_id: 0 };
const POLL_MS = 30_000;

/** Everything under this key is refetched when a push arrives (see hooks.ts). */
export const NOTIFICATIONS_KEY = "notifications";
const summaryKey = (userId: number) => [NOTIFICATIONS_KEY, userId, "summary"] as const;
const listKey = (userId: number) => [NOTIFICATIONS_KEY, userId, "list"] as const;

export function useNotificationSummary(): NotificationSummary {
  const user = useCurrentUser();
  const { data } = useQuery({
    queryKey: summaryKey(user.id),
    queryFn: fetchNotificationSummary,
    staleTime: 10_000,
    // Paused while the app is in the background (React Query follows the app's focus).
    refetchInterval: POLL_MS,
  });
  return data ?? EMPTY;
}

export function useNotificationList() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: listKey(user.id),
    queryFn: async () => {
      const { results, ...summary } = await fetchNotifications();
      queryClient.setQueryData(summaryKey(user.id), summary);
      return results;
    },
    staleTime: 0,
  });
}

const noop = () => undefined;

/** Marks notifications read (not for spectators: that would change someone else's inbox). */
export function useMarkNotificationsRead(): { canMark: boolean; markRead: (request: NotificationReadRequest) => void } {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: markNotificationsRead,
    onMutate: (request) => {
      const items = queryClient.getQueryData<AppNotification[]>(listKey(user.id)) ?? [];
      queryClient.setQueryData<NotificationSummary>(summaryKey(user.id), (summary) =>
        readSummary(summary ?? EMPTY, request, items)
      );
      queryClient.setQueryData<AppNotification[]>(listKey(user.id), (list) => list && readItems(list, request));
    },
    onSuccess: (summary) => queryClient.setQueryData(summaryKey(user.id), summary),
    onError: () => queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user.id] }),
  });
  const canMark = !user.spectator;
  return { canMark, markRead: canMark ? mutate : noop };
}

/**
 * For the tab bar: the unread summary (polled), each tab's badge, and clearing a section's badge
 * when its screen is opened.
 */
export function useNotificationTabs(): { unread: number; badges: TabBadges } {
  const user = useCurrentUser();
  const pathname = usePathname();
  const summary = useNotificationSummary();
  const { canMark, markRead } = useMarkNotificationsRead();

  const kind = sectionKind(pathname, user.role);
  const pending = kind ? (summary.by_kind[kind] ?? 0) : 0;
  useEffect(() => {
    if (canMark && kind && pending > 0) markRead({ kind });
  }, [canMark, kind, pending, markRead]);

  return { unread: summary.unread, badges: tabBadges(summary.by_kind, user.role) };
}
