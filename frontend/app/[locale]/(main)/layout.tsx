"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaHome,
  FaTrophy,
  FaFileAlt,
  FaBookOpen,
  FaGraduationCap,
  FaBullhorn,
  FaAtom,
  FaClipboardCheck,
  FaClipboardList,
  FaCalendarAlt,
  FaCalendarCheck,
  FaStar,
} from "react-icons/fa";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { AutoComplete, ConfigProvider, Dropdown, Input, Modal, Space, theme as antdTheme } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AxiosError, AxiosResponse } from "axios";
import { Avatar } from "@mui/material";
import { useTranslations } from "next-intl";

import styles from "./MainLayout.module.scss";
import api from "@/interceptors";
import { clearTokens, getRefreshToken } from "@/lib/auth";
import { UserMeData } from "./profile/interface";
import {
  ReturnedAnnouncementData,
  ReturnedExamData,
  ReturnedExerciseData,
  ReturnedSubjectData,
  SearchKind,
} from "./interface";
import { getDropdownItems } from "./utils";
import LanguageSwitcher from "../components/LanguageSwitcher/LanguageSwitcher";
import { getLocalizedValue } from "@/lib/localized";
import { MeContext } from "./components/MeContext";

type SearchAutoOption = DefaultOptionType & {
  kind: SearchKind;
  id: number;
};

const THEME_KEY = "theme";

function getTitleFromAnnouncement(
  a: ReturnedAnnouncementData,
  locale: string
): string {
  const title = getLocalizedValue(a.title, locale);
  if (title) return title;

  return getLocalizedValue(a.content, locale);
}

function shorten(text: string, max = 60): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("Layout");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMe, setUserMe] = useState<UserMeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [options, setOptions] = useState<SearchAutoOption[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef("");

  const pathname = usePathname();
  const router = useRouter();

  const locale = (pathname?.split("/")[1] || "en").trim();
  const cleanPath = pathname?.replace(`/${locale}`, "") || "/";

  useEffect(() => {
    setSidebarOpen(false);

    api
      .get<UserMeData>("/user/me/")
      .then((res: AxiosResponse<UserMeData>) => setUserMe(res.data))
      .catch((err: AxiosError) => console.log(err.message));
  }, [pathname]);

  useEffect(() => {
    try {
      const savedTheme =
        (window.localStorage.getItem(THEME_KEY) as "dark" | "light" | null) || "dark";

      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // ignore
    }

    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const showModal = () => setIsModalOpen(true);

  const handleLogout = async () => {
    try {
      await api.post("/user/logout/", { refresh: getRefreshToken() });
    } catch (err: unknown) {
      console.log("Logout failed:", err);
    } finally {
      clearTokens();
      router.push(`/${locale}/login`);
    }
  };

  const handleOk = () => {
    setIsModalOpen(false);
    handleLogout();
  };

  const onDropdownClick = ({ key }: { key: string }) => {
    if (key === "logout") showModal();
    if (key === "profile") router.push(`/${locale}/profile`);
  };

  const isActive = (href: string) => {
    const cleanHref = href.replace(`/${locale}`, "") || "/";

    if (cleanHref === "/home") {
      return cleanPath === "/home" || cleanPath === "/";
    }

    return cleanPath === cleanHref || cleanPath.startsWith(cleanHref + "/");
  };

  const role = userMe?.role;
  const isStaff = role === "teacher" || role === "admin";

  const navItems = [
    {
      href: `/${locale}/home`,
      label: t("nav.home"),
      icon: <FaHome className={styles.navIcon} />,
    },
    {
      href: `/${locale}/announcement`,
      label: t("nav.announcement"),
      icon: <FaBullhorn className={styles.navIcon} />,
    },
    {
      href: `/${locale}/leader-board`,
      label: t("nav.leaderboard"),
      icon: <FaTrophy className={styles.navIcon} />,
    },
    ...(isStaff
      ? [
          {
            href: `/${locale}/attendance`,
            label: t("nav.attendance"),
            icon: <FaClipboardCheck className={styles.navIcon} />,
          },
        ]
      : []),
    ...(role === "teacher"
      ? [
          {
            href: `/${locale}/gradebook`,
            label: t("nav.gradebook"),
            icon: <FaClipboardList className={styles.navIcon} />,
          },
        ]
      : []),
    ...(role === "student" || role === "parent"
      ? [
          {
            href: `/${locale}/marks`,
            label: t("nav.marks"),
            icon: <FaStar className={styles.navIcon} />,
          },
        ]
      : []),
    ...(role && role !== "admin"
      ? [
          {
            href: `/${locale}/calendar`,
            label: t("nav.calendar"),
            icon: <FaCalendarCheck className={styles.navIcon} />,
          },
        ]
      : []),
    {
      href: `/${locale}/subjects`,
      label: t("nav.subjects"),
      icon: <FaAtom className={styles.navIcon} />,
    },
    {
      href: `/${locale}/exercise`,
      label: t("nav.exercises"),
      icon: <FaBookOpen className={styles.navIcon} />,
    },
    {
      href: `/${locale}/exam`,
      label: t("nav.exams"),
      icon: <FaFileAlt className={styles.navIcon} />,
    },
    ...(userMe && !isStaff
      ? [
          {
            href: `/${locale}/schedule`,
            label: t("nav.schedule"),
            icon: <FaCalendarAlt className={styles.navIcon} />,
          },
        ]
      : []),
  ];

  const fetchSearch = async (q: string) => {
    const trimmed = q.trim();

    if (!trimmed) {
      setOptions([]);
      lastQueryRef.current = "";
      return;
    }

    if (lastQueryRef.current === trimmed) return;
    lastQueryRef.current = trimmed;

    try {
      const res = await api.get("/search/", { params: { q: trimmed } });

      const subjects: SearchAutoOption[] = (res.data?.subjects ?? []).map(
        (s: ReturnedSubjectData) => {
          const subjectName = getLocalizedValue(s.name, locale);

          return {
            value: `subject:${s.pk}`,
            label: `📚 ${t("search.subject")}: ${shorten(subjectName) || t("search.untitled")}`,
            kind: "subject",
            id: s.pk,
          };
        }
      );

      const exams: SearchAutoOption[] = (res.data?.exams ?? []).map(
        (e: ReturnedExamData) => {
          const examTitle = getLocalizedValue(e.title, locale);

          return {
            value: `exam:${e.pk}`,
            label: `📝 ${t("search.exam")}: ${shorten(examTitle) || t("search.untitled")}`,
            kind: "exam",
            id: e.pk,
          };
        }
      );

      const announcements: SearchAutoOption[] = (res.data?.announcements ?? []).map(
        (a: ReturnedAnnouncementData) => {
          const title = getTitleFromAnnouncement(a, locale);

          return {
            value: `announcement:${a.pk}`,
            label: `📣 ${t("search.announcement")}: ${shorten(title) || t("search.untitled")}`,
            kind: "announcement",
            id: a.pk,
          };
        }
      );

      const exercises: SearchAutoOption[] = (res.data?.exercises ?? []).map(
        (e: ReturnedExerciseData) => {
          const title = getLocalizedValue(e.title, locale);

          return {
            value: `exercise:${e.id}`,
            label: `📘 ${t("search.exercise")}: ${shorten(title) || t("search.untitled")}`,
            kind: "exercise",
            id: e.subject__id ?? e.id,
          };
        }
      );

      setOptions([...subjects, ...exams, ...announcements, ...exercises]);
    } catch {
      setOptions([]);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchSearch(value);
    }, 250);
  };

  const handleSelect = (_value: string, option: SearchAutoOption) => {
    const { kind, id } = option;

    switch (kind) {
      case "subject":
        router.push(`/${locale}/subjects?openSubject=${id}`);
        break;
      case "exam":
        router.push(`/${locale}/exam?openExam=${id}`);
        break;
      case "announcement":
        router.push(`/${locale}/announcement?openAnnouncement=${id}`);
        break;
      case "exercise":
        router.push(`/${locale}/exercise?openSubject=${id}`);
        break;
      default:
        break;
    }

    setOptions([]);
    setSearchValue("");
    lastQueryRef.current = "";
  };

  const handleChange = (value: string) => {
    setSearchValue(value);

    if (!value.trim()) {
      setOptions([]);
      lastQueryRef.current = "";
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setOptions([]), 150);
  };

  const handleEnterSearch = (value: string) => {
    fetchSearch(value);
  };

  return (
    <ConfigProvider
      theme={{
        // Same brand blue, rounded controls and dark surfaces as the mobile app.
        algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token:
          theme === "dark"
            ? { colorPrimary: "#4c8dff", borderRadius: 12, colorBgContainer: "#12161f", colorBgElevated: "#1b2130" }
            : { colorPrimary: "#1677ff", borderRadius: 12 },
      }}
    >
      <div className={styles.layoutMainContainer}>
        <nav className={`${styles.navBar} ${sidebarOpen ? styles.navBarOpen : ""}`}>
          <div className={styles.mainLogoContainer}>
            <FaGraduationCap className={styles.schoolIcon} />
            <span>{t("school")}</span>
          </div>

          <div className={styles.middleWrapper}>
            <div>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.redirectionCaptions} ${
                    isActive(item.href) ? styles.activeLink : ""
                  }`}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <div className={styles.pageRedirectionWrapper}>
                    {item.icon}
                    <span className={styles.MenuCommandSection}>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ width: "100%" }}>
              <div className={styles.bottomControls}>
                <button
                  type="button"
                  className={styles.themeToggle}
                  onClick={handleThemeToggle}
                  aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                  title={theme === "dark" ? "Light mode" : "Dark mode"}
                >
                  {theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
                </button>

                <LanguageSwitcher variant="sidebar" />
              </div>
            </div>
          </div>
        </nav>

        <div className={styles.headerAndMainWrapper}>
          <header className={styles.headerSection}>
            <FaBars className={styles.burgerIcon} onClick={toggleSidebar} />

            <div className={styles.myProfileOuterWrapper}>
              <div className={styles.myProfileWrapper}>
                <div className={styles.searchBarComponent}>
                  <AutoComplete
                    options={options}
                    value={searchValue}
                    onSearch={handleSearch}
                    onSelect={handleSelect}
                    onChange={handleChange}
                    filterOption={false}
                    popupMatchSelectWidth
                    classNames={{ popup: { root: styles.searchDropdown } }}
                    className={styles.searchInput}
                  >
                    <Input
                      placeholder={t("search.placeholder")}
                      allowClear
                      onPressEnter={(e) =>
                        handleEnterSearch((e.target as HTMLInputElement).value)
                      }
                      onBlur={handleBlur}
                    />
                  </AutoComplete>
                </div>

                <Dropdown
                  trigger={["click"]}
                  menu={{ items: getDropdownItems(t), onClick: onDropdownClick }}
                  placement="bottomRight"
                >
                  <a onClick={(e) => e.preventDefault()}>
                    <Space>
                      <div className={styles.outerWrapperProfile}>
                        <div className={styles.userAndDropOutLineWrapper}>
                          <div className={styles.profilePictureWrapper}>
                            <Avatar
                              src={userMe?.profilePic ?? undefined}
                              className={styles.avatar}
                              sx={{ width: 40, height: 40 }}
                            />
                          </div>
                        </div>
                      </div>
                    </Space>
                  </a>
                </Dropdown>
              </div>
            </div>
          </header>

          <main id="app-scroll" className={styles.childrenPassingContainer}>
            <MeContext.Provider value={userMe}>{children}</MeContext.Provider>
          </main>
        </div>

        {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}

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