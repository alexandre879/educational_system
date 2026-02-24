"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaHome,
  FaTrophy,
  FaFileAlt,
  FaBookOpen,
  FaSchool,
  FaBullhorn,
  // FaRobot,
  FaAtom,
  FaClipboardCheck,
} from "react-icons/fa";
import styles from "./MainLayout.module.scss";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dropdown, Modal, Space, Input, AutoComplete } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import api from "@/interceptors";
import { UserMeData } from "./profile/interface";
import { AxiosError, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import { dropdownItems } from "./utils";
import { Avatar } from "@mui/material";
import {
  ReturnedAnnouncementData,
  ReturnedExamData,
  ReturnedSubjectData,
  SearchKind,
} from "./interface";

type SearchAutoOption = DefaultOptionType & {
  kind: SearchKind;
  id: number;
};

function getTitleFromAnnouncement(a: ReturnedAnnouncementData): string {

  const maybe = a as unknown as { title?: unknown; content?: unknown };

  if (typeof maybe.title === "string") return maybe.title;
  if (typeof maybe.content === "string") return maybe.content;

  return "";
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMe, setUserMe] = useState<UserMeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [options, setOptions] = useState<SearchAutoOption[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>("");

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setSidebarOpen(false);
    api
      .get<UserMeData>("/user/me/")
      .then((res: AxiosResponse<UserMeData>) => setUserMe(res.data))
      .catch((err: AxiosError) => console.log(err.message));
  }, [pathname]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const showModal = () => setIsModalOpen(true);

  const handleLogout = async () => {
    try {
      await api.post("/user/logout/", { refresh: Cookies.get("refresh") });
    } catch (err: unknown) {
      console.log("Logout failed:", err);
    } finally {
      Cookies.remove("access");
      Cookies.remove("refresh");
      router.push("/login");
    }
  };

  const handleOk = () => {
    setIsModalOpen(false);
    handleLogout();
  };

  const handleCancel = () => setIsModalOpen(false);

  const onDropdownClick = ({ key }: { key: string }) => {
    if (key === "logout") showModal();
    if (key === "profile") router.push("/profile");
  };

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navItems = [
    { href: "/home", label: "HOME", icon: <FaHome className={styles.navIcon} /> },
    { href: "/announcement", label: "ANNOUNCEMENT", icon: <FaBullhorn className={styles.navIcon} /> },
    { href: "/leader-board", label: "LEADER BOARD", icon: <FaTrophy className={styles.navIcon} /> },

    ...(userMe?.role === "teacher" || userMe?.role === "admin"
      ? [{ href: "/attendance", label: "ATTENDANCE", icon: <FaClipboardCheck className={styles.navIcon} /> }]
      : []),

    { href: "/subjects", label: "SUBJECTS", icon: <FaAtom className={styles.navIcon} /> },
    { href: "/exercise", label: "EXERCISES", icon: <FaBookOpen className={styles.navIcon} /> },
    { href: "/exam", label: "EXAMS", icon: <FaFileAlt className={styles.navIcon} /> },

    ...(userMe?.role !== "teacher" && userMe?.role !== "admin"
      ? [{ href: "/schedule", label: "SCHEDULE", icon: <FaFileAlt className={styles.navIcon} /> }]
      : []),

    // { href: "/aisupport", label: "AI SUPPORT", icon: <FaRobot className={styles.navIcon} /> },
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

      const subjects: SearchAutoOption[] = (res.data?.subjects ?? []).map((s: ReturnedSubjectData) => ({
        value: `subject:${s.pk}`,
        label: `📚 Subject: ${s.name}`,
        kind: "subject",
        id: s.pk,
      }));

      const exams: SearchAutoOption[] = (res.data?.exams ?? []).map((e: ReturnedExamData) => ({
        value: `exam:${e.pk}`,
        label: `📝 Exam: ${e.title}`,
        kind: "exam",
        id: e.pk,
      }));

      const announcements: SearchAutoOption[] = (res.data?.announcements ?? []).map((a: ReturnedAnnouncementData) => {
        const title = getTitleFromAnnouncement(a);
        const short = title.slice(0, 60) + (title.length > 60 ? "..." : "");

        return {
          value: `announcement:${a.pk}`,
          label: `📣 Announcement: ${short || "Untitled"}`,
          kind: "announcement",
          id: a.pk,
        };
      });

      setOptions([...subjects, ...exams, ...announcements]);
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

  // ✅ no `any` here
  const handleSelect = (_value: string, option: SearchAutoOption) => {
    const kind = option.kind;
    const id = option.id;

    if (kind === "subject") router.push(`/subject/${id}`);
    if (kind === "exam") router.push(`/exam/${id}/start/`);
    if (kind === "announcement") router.push(`/announcement/${id}`);

    setOptions([]);
  };

  const handleBlur = () => {
    setTimeout(() => setOptions([]), 150);
  };

  return (
    <div className={styles.layoutMainContainer}>
      <nav className={`${styles.navBar} ${sidebarOpen ? styles.navBarOpen : ""}`}>
        <div className={styles.mainLogoContainer}>
          <FaSchool className={styles.schoolIcon} /> <span>MY SCHOOL</span>
        </div>

        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.redirectionCaptions} ${isActive(item.href) ? styles.activeLink : ""}`}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <div className={styles.pageRedirectionWrapper}>
              {item.icon}
              <span className={styles.MenuCommandSection}>{item.label}</span>
            </div>
          </Link>
        ))}
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
                  onChange={setSearchValue}
                  onSelect={handleSelect}
                  filterOption={false}
                  classNames={{ popup: { root: styles.searchDropdown } }}
                  className={styles.searchInput}
                >
                  <Input.Search
                    placeholder="Search..."
                    enterButton
                    onSearch={(v) => fetchSearch(v)}
                    onBlur={handleBlur}
                  />
                </AutoComplete>
              </div>

              <Dropdown trigger={["click"]} menu={{ items: dropdownItems, onClick: onDropdownClick }} placement="bottomRight">
                <a onClick={(e) => e.preventDefault()}>
                  <Space>
                    <div className={styles.outerWrapperProfile}>
                      <div className={styles.userAndDropOutLineWrapper}>
                        <div className={styles.profilePictureWrapper}>
                          <Avatar src={userMe?.profilePic ?? undefined} className={styles.avatar} sx={{ width: 40, height: 40 }} />
                        </div>
                      </div>
                    </div>
                  </Space>
                </a>
              </Dropdown>
            </div>
          </div>
        </header>

        <main className={styles.childrenPassingContainer}>{children}</main>
      </div>

      {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}

      <Modal
        title="Are you sure you wanna log out ?"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        styles={{ mask: { zIndex: 1000 } }}
      />
    </div>
  );
}