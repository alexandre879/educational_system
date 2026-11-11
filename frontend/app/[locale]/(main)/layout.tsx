"use client";

import { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  GraduationCap,
  Keyboard,
  Languages,
  LogOut,
  Menu,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Search,
  Sun,
  Timer,
  UserRound,
} from "lucide-react";
import { ConfigProvider, Dropdown, Modal, theme as antdTheme } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AxiosError, AxiosResponse } from "axios";
import { Avatar } from "@mui/material";
import { useTranslations } from "next-intl";

import styles from "./MainLayout.module.scss";
import api from "@/interceptors";
import { clearTokens, getRefreshToken } from "@/lib/auth";
import { ACCENTS, resolvedTheme, setAppearance, toggleTheme, useAppearance, useEffectiveAccent } from "@/lib/appearance";
import { focusTimer, useFocusTimer } from "@/lib/focusTimer";
import { formatCount, NAV_KIND, resetNotifications, useNotifications } from "@/lib/notifications";
import { useLiquidLens } from "@/lib/liquidLens";
import { UserMeData } from "./profile/interface";
import LanguageSwitcher, { LANGUAGE_OPTIONS, pathForLocale } from "../components/LanguageSwitcher/LanguageSwitcher";
import { MeContext } from "./components/MeContext";
import AppearancePanel from "./components/shell/AppearancePanel";
import CommandPalette, { type PaletteAction } from "./components/shell/CommandPalette";
import {
  BackToTop,
  ConnectionPill,
  FocusChip,
  HeaderClock,
  ScrollProgress,
  useAppScrolled,
} from "./components/shell/HeaderBits";
import MobileDock from "./components/shell/MobileDock";
import { NotificationBell, NotificationToasts, useNotificationRuntime } from "./components/shell/Notifications";
import ShortcutsHelp from "./components/shell/ShortcutsHelp";
import SpectatorBar from "./components/shell/SpectatorBar";
import StudyDock from "./components/shell/StudyDock";
import { buildNavItems, isActivePath, profileItem } from "./components/shell/navItems";
import { isMac, useHotkeys } from "./components/shell/useHotkeys";

type Panel = "palette" | "appearance" | "shortcuts" | null;

export default function MainLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("Layout");
  const tg = useTranslations("Glass");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMe, setUserMe] = useState<UserMeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [studyOpen, setStudyOpen] = useState(false);
  const [mod, setMod] = useState("Ctrl");

  const appearance = useAppearance();
  // Follows automatic accent changes too.
  const accent = useEffectiveAccent();
  const focus = useFocusTimer();
  const theme = resolvedTheme(appearance);
  const collapsed = appearance.sidebarCollapsed;

  const pathname = usePathname();
  const router = useRouter();

  const headerRef = useRef<HTMLElement>(null);
  const navListRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  const locale = (pathname?.split("/")[1] || "en").trim();
  const cleanPath = pathname?.replace(`/${locale}`, "") || "/";

  // Real refraction along the header's edges (Chromium); elsewhere it's frosted glass.
  useLiquidLens(headerRef, { bezel: 14, scale: 34 });

  useEffect(() => {
    setSidebarOpen(false);

    api
      .get<UserMeData>("/user/me/")
      .then((res: AxiosResponse<UserMeData>) => setUserMe(res.data))
      .catch((err: AxiosError) => console.log(err.message));
  }, [pathname]);

  useEffect(() => {
    if (isMac()) setMod("⌘");
  }, []);

  const role = userMe?.role;
  const tNav = useCallback((key: string) => tg(key), [tg]);
  const navItems = useMemo(() => buildNavItems(role, locale, tNav), [role, locale, tNav]);
  const profile = useMemo(() => profileItem(locale, tNav), [locale, tNav]);
  const current = [...navItems, profile].find((item) => isActivePath(pathname ?? "", item.href, locale)) ?? null;
  // Unread notifications: badges on menu items, the bell, pop-ups and the tab title.
  const notifications = useNotifications();
  const badgeFor = (key: string) => (NAV_KIND[key] ? (notifications.by_kind[NAV_KIND[key]] ?? 0) : 0);
  const canMarkRead = Boolean(userMe) && !userMe?.spectator;
  const notificationRuntime = useNotificationRuntime({
    enabled: Boolean(userMe),
    canMark: canMarkRead,
    locale,
    pathname: pathname ?? "",
  });
  const dockItems = navItems.filter((item) => item.dock).map((item) => ({ ...item, badge: badgeFor(item.key) }));
  const moreBadge = navItems.filter((item) => !item.dock).reduce((sum, item) => sum + badgeFor(item.key), 0);
  const examInProgress = /^\/exam\/[^/]+\/start/.test(cleanPath);
  // Like an iOS large title: the page names itself, and the header takes over once that scrolls away.
  const showCrumb = useAppScrolled(56, pathname ?? "");

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const toggleCollapsed = useCallback(
    () => setAppearance({ sidebarCollapsed: !appearance.sidebarCollapsed }),
    [appearance.sidebarCollapsed]
  );

  const handleLogout = async () => {
    try {
      await api.post("/user/logout/", { refresh: getRefreshToken() });
    } catch (err: unknown) {
      console.log("Logout failed:", err);
    } finally {
      clearTokens();
      resetNotifications();
      router.push(`/${locale}/login`);
    }
  };

  const handleOk = () => {
    setIsModalOpen(false);
    handleLogout();
  };

  const onDropdownClick = ({ key }: { key: string }) => {
    if (key === "logout") setIsModalOpen(true);
    if (key === "profile") router.push(`/${locale}/profile`);
    if (key === "appearance") setPanel("appearance");
  };

  const accountMenu: MenuProps["items"] = [
    { key: "profile", label: tg("nav.profile"), icon: <UserRound size={15} /> },
    { key: "appearance", label: tg("header.appearance"), icon: <Palette size={15} /> },
    { type: "divider" },
    { key: "logout", danger: true, label: tg("palette.logout"), icon: <LogOut size={15} /> },
  ];

  // The selection lens slides between sidebar items. Its leading edge moves first and the
  // trailing edge follows, so it stretches toward the new item like a drop of liquid.
  useLayoutEffect(() => {
    const list = navListRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const place = (animate: boolean) => {
      const active = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        indicator.style.opacity = "0";
        return;
      }
      const top = active.offsetTop;
      const bottom = list.clientHeight - (top + active.offsetHeight);
      const previous = Number(indicator.dataset.top ?? -1);
      const lead = "380ms var(--ease-spring)";
      const follow = "620ms var(--ease-spring) 50ms";

      indicator.style.transition =
        animate && previous >= 0
          ? top > previous
            ? `bottom ${lead}, top ${follow}, opacity 200ms ease`
            : `top ${lead}, bottom ${follow}, opacity 200ms ease`
          : "opacity 200ms ease";
      indicator.style.top = `${top}px`;
      indicator.style.bottom = `${bottom}px`;
      indicator.style.opacity = "1";
      indicator.dataset.top = String(top);
    };

    place(true);
    let height = list.clientHeight;
    const observer = new ResizeObserver(() => {
      if (list.clientHeight === height) return;
      height = list.clientHeight;
      place(false);
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [pathname, navItems, collapsed]);

  const closePanel = useCallback(() => setPanel(null), []);
  const goTo = useCallback((href: string) => router.push(href), [router]);

  useHotkeys({
    palette: () => setPanel((open) => (open === "palette" ? null : "palette")),
    help: () => setPanel("shortcuts"),
    theme: toggleTheme,
    study: () => setStudyOpen((open) => !open),
    sidebar: toggleCollapsed,
    go: (key) => {
      const target = [...navItems, profile].find((item) => item.hotkey === key);
      if (target) goTo(target.href);
      return Boolean(target);
    },
  });

  const paletteActions: PaletteAction[] = [
    {
      id: "theme",
      label: theme === "dark" ? tg("header.toLight") : tg("header.toDark"),
      Icon: theme === "dark" ? Sun : Moon,
      run: toggleTheme,
      shortcut: ["⇧", "T"],
    },
    { id: "appearance", label: tg("palette.appearance"), Icon: Palette, run: () => setPanel("appearance") },
    focus.running
      ? { id: "focus", label: tg("palette.focusPause"), Icon: Pause, run: focusTimer.pause }
      : {
          id: "focus",
          label: tg("palette.focusStart"),
          Icon: Timer,
          run: () => {
            focusTimer.start();
            setStudyOpen(true);
          },
          keywords: "pomodoro timer",
        },
    { id: "study", label: tg("palette.openStudy"), Icon: Timer, run: () => setStudyOpen(true), shortcut: ["⇧", "F"] },
    {
      id: "sidebar",
      label: collapsed ? tg("header.expand") : tg("header.collapse"),
      Icon: collapsed ? PanelLeftOpen : PanelLeftClose,
      run: toggleCollapsed,
      shortcut: ["["],
    },
    { id: "shortcuts", label: tg("palette.shortcuts"), Icon: Keyboard, run: () => setPanel("shortcuts"), shortcut: ["?"] },
    ...LANGUAGE_OPTIONS.filter((option) => option.value !== locale).map((option) => ({
      id: `lang-${option.value}`,
      label: tg("palette.language", { name: option.label }),
      Icon: Languages,
      run: () => router.push(pathForLocale(pathname ?? "/", option.value)),
      keywords: "language locale",
    })),
    { id: "profile", label: tg("nav.profile"), Icon: UserRound, run: () => goTo(profile.href) },
    { id: "logout", label: tg("palette.logout"), Icon: LogOut, run: () => setIsModalOpen(true) },
  ];

  const primary = ACCENTS[accent][theme];
  const antdConfig = useMemo(
    () => ({
      // Same brand color and rounded controls as the mobile app, on translucent surfaces.
      algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token:
        theme === "dark"
          ? {
              colorPrimary: primary,
              borderRadius: 12,
              colorBgContainer: "rgba(255, 255, 255, 0.045)",
              colorBgElevated: "rgba(22, 27, 40, 0.8)",
            }
          : {
              colorPrimary: primary,
              borderRadius: 12,
              colorBgContainer: "rgba(255, 255, 255, 0.62)",
              colorBgElevated: "rgba(255, 255, 255, 0.84)",
            },
    }),
    [theme, primary]
  );

  return (
    <ConfigProvider theme={antdConfig}>
      <div className={styles.layoutMainContainer}>
        <nav className={`${styles.navBar} ${sidebarOpen ? styles.navBarOpen : ""} lg-chrome lg-rim`}>
          <div className={styles.brandRow}>
            <Link href={`/${locale}/home`} className={styles.brand}>
              <span className={styles.brandMark}>
                <GraduationCap size={22} strokeWidth={2.2} />
              </span>
              <span className={styles.brandName}>{t("school")}</span>
            </Link>
            <button
              type="button"
              className={styles.collapseButton}
              onClick={toggleCollapsed}
              aria-label={collapsed ? tg("header.expand") : tg("header.collapse")}
              title={collapsed ? tg("header.expand") : tg("header.collapse")}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <div className={styles.navList} ref={navListRef}>
            <span className={styles.navIndicator} ref={indicatorRef} aria-hidden="true" />
            {navItems.map((item) => {
              const active = isActivePath(pathname ?? "", item.href, locale);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                  aria-current={active ? "page" : undefined}
                  data-tip={collapsed ? item.label : undefined}
                >
                  <item.Icon className={styles.navIcon} size={19} strokeWidth={active ? 2.3 : 2} />
                  <span className={styles.navLabel}>{item.label}</span>
                  {badgeFor(item.key) > 0 ? (
                    <span className={styles.navBadge}>{formatCount(badgeFor(item.key))}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.footerButtons}>
              <button
                type="button"
                className={styles.footerButton}
                onClick={toggleTheme}
                aria-label={theme === "dark" ? tg("header.toLight") : tg("header.toDark")}
                data-tip={collapsed ? (theme === "dark" ? tg("header.toLight") : tg("header.toDark")) : undefined}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                className={styles.footerButton}
                onClick={() => setPanel("appearance")}
                aria-label={tg("header.appearance")}
                data-tip={collapsed ? tg("header.appearance") : undefined}
              >
                <Palette size={18} />
              </button>
              <button
                type="button"
                className={styles.footerButton}
                onClick={() => setPanel("shortcuts")}
                aria-label={tg("palette.shortcuts")}
                data-tip={collapsed ? tg("palette.shortcuts") : undefined}
              >
                <Keyboard size={18} />
              </button>
            </div>

            <div className={styles.languageSlot}>
              <LanguageSwitcher variant="sidebar" />
            </div>
          </div>
        </nav>

        <div className={styles.headerAndMainWrapper}>
          <header ref={headerRef} className={`${styles.headerSection} lg-rim`}>
            <button type="button" className={styles.burgerButton} onClick={toggleSidebar} aria-label={tg("header.menu")}>
              <Menu size={20} />
            </button>

            {current ? (
              <div className={styles.crumb} data-visible={showCrumb} aria-hidden={!showCrumb}>
                <span className={styles.crumbIcon}>
                  <current.Icon size={17} />
                </span>
                <span className={styles.crumbLabel}>{current.label}</span>
              </div>
            ) : null}

            <div className={styles.headerSpacer} />

            <button type="button" className={styles.searchPill} onClick={() => setPanel("palette")} aria-label={tg("header.search")}>
              <Search size={16} />
              <span className={styles.searchText}>{tg("header.search")}</span>
              <span className={styles.searchKeys}>
                <kbd>{mod}</kbd>
                <kbd>K</kbd>
              </span>
            </button>

            <FocusChip onClick={() => setStudyOpen(true)} />
            <HeaderClock />

            <NotificationBell canMark={canMarkRead} onOpen={notificationRuntime.open} />

            <Dropdown trigger={["click"]} menu={{ items: accountMenu, onClick: onDropdownClick }} placement="bottomRight">
              <button type="button" className={styles.avatarButton} aria-label={tg("nav.profile")}>
                <Avatar src={userMe?.profilePic ?? undefined} className={styles.avatar} sx={{ width: 38, height: 38 }} />
              </button>
            </Dropdown>

            <ScrollProgress watch={pathname ?? ""} />
          </header>

          <main id="app-scroll" className={styles.childrenPassingContainer}>
            {userMe?.spectator ? <SpectatorBar info={userMe.spectator} locale={locale} onExit={handleLogout} /> : null}
            <div key={pathname} className="lg-route">
              <MeContext.Provider value={userMe}>{children}</MeContext.Provider>
            </div>
          </main>

          <BackToTop />
        </div>

        {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}

        <MobileDock
          items={dockItems}
          activeKey={current?.key ?? null}
          moreActive={sidebarOpen || (current !== null && !current.dock)}
          moreLabel={tg("header.more")}
          onMore={() => setSidebarOpen(true)}
          moreBadge={moreBadge}
          label={tg("header.menu")}
        />

        <StudyDock open={studyOpen} onOpenChange={setStudyOpen} hidden={examInProgress} />
        <ConnectionPill />
        <NotificationToasts
          toasts={notificationRuntime.toasts}
          corner={appearance.notifyCorner}
          onOpen={notificationRuntime.open}
          onDismiss={notificationRuntime.dismiss}
        />

        <CommandPalette open={panel === "palette"} onClose={closePanel} navItems={[...navItems, profile]} actions={paletteActions} />
        <AppearancePanel open={panel === "appearance"} onClose={closePanel} />
        <ShortcutsHelp open={panel === "shortcuts"} onClose={closePanel} navItems={[...navItems, profile]} />

        <Modal
          title={t("logout.title")}
          closable={{ "aria-label": "Custom Close Button" }}
          open={isModalOpen}
          onOk={handleOk}
          onCancel={() => setIsModalOpen(false)}
          okText={t("logout.ok")}
          cancelText={t("logout.cancel")}
        />
      </div>
    </ConfigProvider>
  );
}
