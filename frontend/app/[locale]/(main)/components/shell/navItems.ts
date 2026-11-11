import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  House,
  LibraryBig,
  Megaphone,
  NotebookPen,
  NotebookTabs,
  ScrollText,
  Star,
  Trophy,
  UserRound,
} from "lucide-react";

import type { UserMeData } from "../../profile/interface";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Second key of the "g then …" shortcut. */
  hotkey: string;
  /** Shown in the floating dock on phones. */
  dock: boolean;
  /** Unread notifications for this section. */
  badge?: number;
}

type Role = UserMeData["role"] | undefined;

const DOCK_BY_ROLE: Record<string, string[]> = {
  student: ["home", "exercises", "exams", "marks"],
  parent: ["home", "marks", "calendar", "announcement"],
  teacher: ["home", "attendance", "gradebook", "exams"],
  admin: ["home", "announcement", "attendance", "exams"],
};

/** The pages a role can open, in sidebar order (same rules as before the redesign). */
export function buildNavItems(role: Role, locale: string, t: (key: string) => string): NavItem[] {
  const isStaff = role === "teacher" || role === "admin";
  const specs: (Omit<NavItem, "href" | "label" | "dock"> & { show: boolean })[] = [
    { key: "home", Icon: House, hotkey: "h", show: true },
    { key: "announcement", Icon: Megaphone, hotkey: "a", show: true },
    { key: "leaderboard", Icon: Trophy, hotkey: "l", show: true },
    { key: "attendance", Icon: ClipboardCheck, hotkey: "t", show: isStaff },
    { key: "gradebook", Icon: NotebookTabs, hotkey: "j", show: role === "teacher" },
    { key: "marks", Icon: Star, hotkey: "m", show: role === "student" || role === "parent" },
    { key: "calendar", Icon: CalendarDays, hotkey: "c", show: Boolean(role) && role !== "admin" },
    { key: "subjects", Icon: LibraryBig, hotkey: "b", show: true },
    { key: "exercises", Icon: NotebookPen, hotkey: "w", show: true },
    { key: "exams", Icon: ScrollText, hotkey: "e", show: true },
    { key: "schedule", Icon: CalendarClock, hotkey: "s", show: Boolean(role) && !isStaff },
  ];

  const dock = DOCK_BY_ROLE[role ?? ""] ?? ["home", "announcement", "exams"];
  const paths: Record<string, string> = {
    announcement: "announcement",
    leaderboard: "leader-board",
    subjects: "subjects",
    exercises: "exercise",
    exams: "exam",
  };

  return specs
    .filter((spec) => spec.show)
    .map((spec) => ({
      key: spec.key,
      Icon: spec.Icon,
      hotkey: spec.hotkey,
      href: `/${locale}/${paths[spec.key] ?? spec.key}`,
      label: t(`nav.${spec.key}`),
      dock: dock.includes(spec.key),
    }));
}

export function profileItem(locale: string, t: (key: string) => string): NavItem {
  return { key: "profile", href: `/${locale}/profile`, label: t("nav.profile"), Icon: UserRound, hotkey: "p", dock: false };
}

/** Whether `pathname` (with locale) is inside the section at `href`. */
export function isActivePath(pathname: string, href: string, locale: string): boolean {
  const path = pathname.replace(`/${locale}`, "") || "/";
  const target = href.replace(`/${locale}`, "") || "/";
  if (target === "/home") return path === "/home" || path === "/";
  return path === target || path.startsWith(target + "/");
}
