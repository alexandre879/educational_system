"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import {
  ArrowUpDown,
  CornerDownLeft,
  History,
  LibraryBig,
  type LucideIcon,
  Megaphone,
  NotebookPen,
  ScrollText,
  Search,
} from "lucide-react";

import api from "@/interceptors";
import { getLocalizedValue, type LocalizedValue } from "@/lib/localized";
import type {
  ReturnedAnnouncementData,
  ReturnedExamData,
  ReturnedExerciseData,
  ReturnedSubjectData,
  SearchKind,
} from "../../interface";
import { GlassDialog } from "./GlassDialog";
import type { NavItem } from "./navItems";
import styles from "./palette.module.scss";

export interface PaletteAction {
  id: string;
  label: string;
  Icon: LucideIcon;
  run: () => void;
  keywords?: string;
  shortcut?: string[];
}

type Group = "recent" | "navigate" | "results" | "actions";
type Kind = SearchKind | "page";

interface Entry {
  id: string;
  group: Group;
  label: string;
  detail?: string;
  Icon: LucideIcon;
  color?: string;
  kind?: Kind;
  shortcut?: string[];
  href?: string;
  run?: () => void;
}

interface Recent {
  label: string;
  href: string;
  kind: Kind;
}

const RECENT_KEY = "paletteRecent";

const KIND_STYLE: Record<SearchKind, { Icon: LucideIcon; color: string }> = {
  subject: { Icon: LibraryBig, color: "#8B5CF6" },
  exam: { Icon: ScrollText, color: "#F97316" },
  announcement: { Icon: Megaphone, color: "#EC4899" },
  exercise: { Icon: NotebookPen, color: "#14B8A6" },
};

function readRecent(): Recent[] {
  try {
    return (JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]") as Recent[]).slice(0, 5);
  } catch {
    return [];
  }
}

function rememberRecent(entry: Recent) {
  try {
    const next = [entry, ...readRecent().filter((item) => item.href !== entry.href)].slice(0, 5);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Recents are a nicety.
  }
}

/** Substring matches rank first (earlier is better), then in-order letter matches; null = no match. */
function fuzzyScore(text: string, query: string): number | null {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (!needle) return 0;

  const at = haystack.indexOf(needle);
  if (at >= 0) return 1000 - at;

  let from = 0;
  let score = 0;
  let streak = 0;
  for (const char of needle) {
    if (char === " ") continue;
    const found = haystack.indexOf(char, from);
    if (found < 0) return null;
    streak = found === from ? streak + 1 : 0;
    score += 1 + streak * 2;
    from = found + 1;
  }
  return score;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className={styles.mark}>{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

function shorten(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function gradeLabel(name: LocalizedValue, category: LocalizedValue, locale: string): string {
  return [getLocalizedValue(name, locale), getLocalizedValue(category, locale)].filter(Boolean).join(" ");
}

export default function CommandPalette({
  open,
  onClose,
  navItems,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  actions: PaletteAction[];
}) {
  const t = useTranslations("Glass.palette");
  const tSearch = useTranslations("Layout.search");
  const locale = useLocale();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Entry[]>([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [wasOpen, setWasOpen] = useState(open);
  const listRef = useRef<HTMLDivElement>(null);

  // Start clean every time the palette opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
      setResults([]);
      setRecent(readRecent());
    }
  }

  // Live search across books, exams, announcements and exercises (debounced, cancelled on new input).
  useEffect(() => {
    const q = query.trim();
    if (!open || !q) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/search/", { params: { q }, signal: controller.signal });
        const untitled = tSearch("untitled");
        const entries: Entry[] = [
          ...((data?.subjects ?? []) as ReturnedSubjectData[]).map((s) => ({
            id: `subject:${s.pk}`,
            kind: "subject" as const,
            label: shorten(getLocalizedValue(s.name, locale)) || untitled,
            detail: gradeLabel(s.grade__name, s.grade__category__name, locale),
            href: `/${locale}/subjects?openSubject=${s.pk}`,
          })),
          ...((data?.exams ?? []) as ReturnedExamData[]).map((e) => ({
            id: `exam:${e.pk}`,
            kind: "exam" as const,
            label: shorten(getLocalizedValue(e.title, locale)) || untitled,
            detail: getLocalizedValue(e.subject__name, locale),
            href: `/${locale}/exam?openExam=${e.pk}`,
          })),
          ...((data?.announcements ?? []) as ReturnedAnnouncementData[]).map((a) => ({
            id: `announcement:${a.pk}`,
            kind: "announcement" as const,
            label: shorten(getLocalizedValue(a.title, locale) || getLocalizedValue(a.content, locale)) || untitled,
            detail: getLocalizedValue(a.subject__name, locale),
            href: `/${locale}/announcement?openAnnouncement=${a.pk}`,
          })),
          ...((data?.exercises ?? []) as ReturnedExerciseData[]).map((e) => ({
            id: `exercise:${e.id}`,
            kind: "exercise" as const,
            label: shorten(getLocalizedValue(e.title, locale)) || untitled,
            detail: getLocalizedValue(e.subject__name ?? null, locale),
            href: `/${locale}/exercise?openSubject=${e.subject__id ?? e.id}`,
          })),
        ].map((entry) => ({ ...entry, group: "results" as const, ...KIND_STYLE[entry.kind] }));
        setResults(entries);
      } catch (error) {
        if (!axios.isCancel(error)) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, locale, tSearch]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim();
    const rank = <T extends { label: string; keywords?: string }>(items: T[]) =>
      items
        .map((item) => ({ item, score: fuzzyScore(`${item.label} ${item.keywords ?? ""}`, q) }))
        .filter((ranked): ranked is { item: T; score: number } => ranked.score !== null)
        .sort((a, b) => b.score - a.score)
        .map((ranked) => ranked.item);

    const navigate: Entry[] = rank(navItems).map((item) => ({
      id: `nav:${item.key}`,
      group: "navigate",
      label: item.label,
      Icon: item.Icon,
      kind: "page",
      href: item.href,
      shortcut: ["G", item.hotkey.toUpperCase()],
    }));

    const actionEntries: Entry[] = rank(actions).map((action) => ({
      id: `action:${action.id}`,
      group: "actions",
      label: action.label,
      Icon: action.Icon,
      run: action.run,
      shortcut: action.shortcut,
    }));

    const recentEntries: Entry[] = q
      ? []
      : recent.map((item) => ({
          id: `recent:${item.href}`,
          group: "recent",
          label: item.label,
          Icon: History,
          kind: item.kind,
          href: item.href,
        }));

    return q ? [...navigate, ...results, ...actionEntries] : [...recentEntries, ...navigate, ...actionEntries];
  }, [query, navItems, actions, recent, results]);

  const activeIndex = Math.min(active, Math.max(0, entries.length - 1));

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, entries.length]);

  const run = (entry: Entry | undefined) => {
    if (!entry) return;
    onClose();
    if (entry.href) {
      rememberRecent({ label: entry.label, href: entry.href, kind: entry.kind ?? "page" });
      router.push(entry.href);
    } else {
      entry.run?.();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      setActive((activeIndex + 1) % Math.max(1, entries.length));
    } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      setActive((activeIndex - 1 + entries.length) % Math.max(1, entries.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(entries[activeIndex]);
    }
  };

  const groupLabel: Record<Group, string> = {
    recent: t("recent"),
    navigate: t("navigate"),
    results: t("results"),
    actions: t("actions"),
  };

  let lastGroup: Group | null = null;
  const rows: ReactNode[] = [];
  entries.forEach((entry, index) => {
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      rows.push(
        <div key={`group:${entry.group}`} className={styles.group} role="presentation">
          {groupLabel[entry.group]}
        </div>
      );
    }
    const isActive = index === activeIndex;
    rows.push(
      <div
        key={entry.id}
        id={`palette-${index}`}
        role="option"
        aria-selected={isActive}
        data-active={isActive}
        className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
        onMouseMove={() => !isActive && setActive(index)}
        onClick={() => run(entry)}
      >
        <span
          className={styles.itemIcon}
          style={entry.color ? { color: entry.color, background: `${entry.color}24` } : undefined}
        >
          <entry.Icon size={17} strokeWidth={2} />
        </span>
        <span className={styles.itemText}>
          <span className={styles.itemLabel}>
            <Highlight text={entry.label} query={query} />
          </span>
          {entry.detail ? <span className={styles.itemDetail}>{entry.detail}</span> : null}
        </span>
        {entry.shortcut ? (
          <span className={styles.itemKeys}>
            {entry.shortcut.map((key) => (
              <kbd key={key}>{key}</kbd>
            ))}
          </span>
        ) : entry.kind && entry.group !== "navigate" ? (
          <span className={styles.itemKind}>{t(`kind.${entry.kind}`)}</span>
        ) : null}
      </div>
    );
  });

  return (
    <GlassDialog open={open} onClose={onClose} label={t("label")} className={styles.palette}>
      <div className={styles.inputRow}>
        <Search size={20} className={styles.inputIcon} aria-hidden="true" />
        <input
          data-autofocus
          className={styles.input}
          placeholder={t("placeholder")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={entries.length ? `palette-${activeIndex}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {searching ? <span className={styles.spinner} aria-label={t("searching")} /> : <kbd>Esc</kbd>}
      </div>

      <div ref={listRef} id="palette-list" className={styles.list} role="listbox" aria-label={t("label")}>
        {rows}
        {entries.length === 0 && !searching ? (
          <div className={styles.empty}>{t("noResults", { query: query.trim() })}</div>
        ) : null}
      </div>

      <div className={styles.footer}>
        <span>
          <ArrowUpDown size={13} /> {t("hintNavigate")}
        </span>
        <span>
          <CornerDownLeft size={13} /> {t("hintOpen")}
        </span>
        <span>
          <kbd>Esc</kbd> {t("hintClose")}
        </span>
      </div>
    </GlassDialog>
  );
}
