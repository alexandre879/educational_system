// "use client";

// import React, { ReactNode, useEffect, useRef, useState } from "react";
// import {
//   FaBars,
//   FaHome,
//   FaTrophy,
//   FaFileAlt,
//   FaBookOpen,
//   FaSchool,
//   FaBullhorn,
//   FaAtom,
//   FaClipboardCheck,
// } from "react-icons/fa";
// import { FaCalendarAlt } from "react-icons/fa";
// import styles from "./MainLayout.module.scss";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { Dropdown, Modal, Space, Input, AutoComplete } from "antd";
// import type { DefaultOptionType } from "antd/es/select";
// import api from "@/interceptors";
// import { UserMeData } from "./profile/interface";
// import { AxiosError, AxiosResponse } from "axios";
// import Cookies from "js-cookie";
// import { Avatar } from "@mui/material";
// import {
//   ReturnedAnnouncementData,
//   ReturnedExamData,
//   ReturnedSubjectData,
//   SearchKind,
// } from "./interface";
// import { useTranslations } from "next-intl";
// import { getDropdownItems } from "./utils";
// import LanguageSwitcher from "../components/LanguageSwitcher/LanguageSwitcher";
// import locale from "antd/es/date-picker/locale/en_US";

// type SearchAutoOption = DefaultOptionType & {
//   kind: SearchKind;
//   id: number;
// };

// function getTitleFromAnnouncement(a: ReturnedAnnouncementData, pathname: string): string {


//   const locale = pathname.split("/")[1];

//   const maybe = a as unknown as { title?: unknown; content?: unknown };

//   if (typeof maybe.title === "string") return maybe.title;
//   if (typeof maybe.content === "string") return maybe.content;

//   return "";
// }

// export default function MainLayout({ children }: { children: ReactNode }) {
//   const t = useTranslations("Layout");

//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [userMe, setUserMe] = useState<UserMeData | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const [options, setOptions] = useState<SearchAutoOption[]>([]);
//   const [searchValue, setSearchValue] = useState("");

//   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const lastQueryRef = useRef<string>("");

//   const pathname = usePathname();
//   const router = useRouter();

//   useEffect(() => {
//     setSidebarOpen(false);
//     api
//       .get<UserMeData>("/user/me/")
//       .then((res: AxiosResponse<UserMeData>) => setUserMe(res.data))
//       .catch((err: AxiosError) => console.log(err.message));
//   }, [pathname]);

//   const toggleSidebar = () => setSidebarOpen((prev) => !prev);
//   const showModal = () => setIsModalOpen(true);

//   const handleLogout = async () => {
//     try {
//       await api.post("/user/logout/", { refresh: Cookies.get("refresh") });
//     } 
//     catch (err: unknown) {
//       console.log(err)
//     } 
//     finally {
//       Cookies.remove("access");
//       Cookies.remove("refresh");
//       router.push("/login");
//     }
//   };

//   const handleOk = () => {
//     setIsModalOpen(false);
//     handleLogout();
//   };

//   const handleCancel = () => setIsModalOpen(false);

//   const onDropdownClick = ({ key }: { key: string }) => {
//     if (key === "logout") showModal();
//     if (key === "profile") router.push("/profile");
//   };

//   const isActive = (href: string) => {
//     if (href === "/home") return pathname === "/home" || pathname === "/";
//     return pathname === href || pathname.startsWith(href + "/");
//   };

//   const navItems = [

//     { href: `/${locale}/home`, label: t("nav.home"), icon: <FaHome className={styles.navIcon} /> },
//     { href: `/${locale}/announcement`, label: t("nav.announcement"), icon: <FaBullhorn className={styles.navIcon} /> },
//     { href: `/${locale}/leader-board`, label: t("nav.leaderboard"), icon: <FaTrophy className={styles.navIcon} /> },

//     ...(userMe?.role === "teacher" || userMe?.role === "admin"
//       ? [{ href: `/${locale}/attendance`, label: t("nav.attendance"), icon: <FaClipboardCheck className={styles.navIcon} /> }]
//       : []),

//     { href: `/${locale}/subjects`, label: t("nav.subjects"), icon: <FaAtom className={styles.navIcon} /> },
//     { href: `/${locale}/exercise`, label: t("nav.exercises"), icon: <FaBookOpen className={styles.navIcon} /> },
//     { href: `/${locale}/exam`, label: t("nav.exams"), icon: <FaFileAlt className={styles.navIcon} /> },

//     ...(userMe?.role !== "teacher" && userMe?.role !== "admin"
//       ? [{ href: `/${locale}/schedule`, label: t("nav.schedule"), icon: <FaCalendarAlt className={styles.navIcon} /> }]
//       : []),

//   ];

//   const fetchSearch = async (q: string) => {
//     const trimmed = q.trim();

//     if (!trimmed) {
//       setOptions([]);
//       lastQueryRef.current = "";
//       return;
//     }

//     if (lastQueryRef.current === trimmed) return;
//     lastQueryRef.current = trimmed;

//     try {
//       const res = await api.get("/search/", { params: { q: trimmed } });

//       const subjects: SearchAutoOption[] = (res.data?.subjects ?? []).map((s: ReturnedSubjectData) => ({
//         value: `subject:${s.pk}`,
//         label: `📚 ${t("search.subject")}: ${s.name}`,
//         kind: "subject",
//         id: s.pk,
//       }));

//       const exams: SearchAutoOption[] = (res.data?.exams ?? []).map((e: ReturnedExamData) => ({
//         value: `exam:${e.pk}`,
//         label: `📝 ${t("search.exam")}: ${e.title}`,
//         kind: "exam",
//         id: e.pk,
//       }));

//       const announcements: SearchAutoOption[] = (res.data?.announcements ?? []).map((a: ReturnedAnnouncementData) => {
//         const title = getTitleFromAnnouncement(a, pathname);
//         const short = title.slice(0, 60) + (title.length > 60 ? "..." : "");

//         return {
//           value: `announcement:${a.pk}`,
//           label: `📣 ${t("search.announcement")}: ${short || t("search.untitled")}`,
//           kind: "announcement",
//           id: a.pk,
//         };
//       });

//       setOptions([...subjects, ...exams, ...announcements]);
//     } 
//     catch {
//       setOptions([]);
//     }
//   };

//   const handleSearch = (value: string) => {
//     setSearchValue(value);

//     if (debounceRef.current) clearTimeout(debounceRef.current);

//     debounceRef.current = setTimeout(() => {
//       fetchSearch(value);
//     }, 250);
//   };

//   const handleSelect = (_value: string, option: SearchAutoOption) => {
//     const kind = option.kind;
//     const id = option.id;

//     if (kind === "subject") router.push(`${locale}/subject/${id}`);
//     if (kind === "exam") router.push(`${locale}/exam/${id}/start/`);
//     if (kind === "announcement") router.push(`${locale}/announcement/${id}`);

//     setOptions([]);
//   };

//   const handleBlur = () => {
//     setTimeout(() => setOptions([]), 150);
//   };

//   return (
//     <div className={styles.layoutMainContainer}>
//       <nav className={`${styles.navBar} ${sidebarOpen ? styles.navBarOpen : ""}`}>
//         <div className={styles.mainLogoContainer}>
//           <FaSchool className={styles.schoolIcon} /> <span>{t("school")}</span>
//         </div>
//         <div className={styles.middleWrapper} >
//           <div>

//             {navItems.map((item) => (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={`${styles.redirectionCaptions} ${isActive(item.href) ? styles.activeLink : ""}`}
//                 aria-current={isActive(item.href) ? "page" : undefined}
//               >
//                 <div className={styles.pageRedirectionWrapper}>
//                   {item.icon}
//                   <span className={styles.MenuCommandSection}>{item.label}</span>
//                 </div>
//               </Link>
//             ))}
//           </div>
//           <LanguageSwitcher />
//         </div>
//       </nav>

//       <div className={styles.headerAndMainWrapper}>
//         <header className={styles.headerSection}>
//           <FaBars className={styles.burgerIcon} onClick={toggleSidebar} />

//           <div className={styles.myProfileOuterWrapper}>
//             <div className={styles.myProfileWrapper}>
//               <div className={styles.searchBarComponent}>
//                 <AutoComplete
//                   options={options}
//                   value={searchValue}
//                   onSearch={handleSearch}
//                   onChange={setSearchValue}
//                   onSelect={handleSelect}
//                   filterOption={false}
//                   classNames={{ popup: { root: styles.searchDropdown } }}
//                   className={styles.searchInput}
//                 >
//                   <Input.Search
//                     placeholder={t("search.placeholder")}
//                     enterButton
//                     onSearch={(v) => fetchSearch(v)}
//                     onBlur={handleBlur}
//                   />
//                 </AutoComplete>
//               </div>

//               <Dropdown
//                 trigger={["click"]}
//                 menu={{ items: getDropdownItems(t), onClick: onDropdownClick }}
//                 placement="bottomRight"
//               >
//                 <a onClick={(e) => e.preventDefault()}>
//                   <Space>
//                     <div className={styles.outerWrapperProfile}>
//                       <div className={styles.userAndDropOutLineWrapper}>
//                         <div className={styles.profilePictureWrapper}>
//                           <Avatar
//                             src={userMe?.profilePic ?? undefined}
//                             className={styles.avatar}
//                             sx={{ width: 40, height: 40 }}
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   </Space>
//                 </a>
//               </Dropdown>
//             </div>
//           </div>
//         </header>

//         <main className={styles.childrenPassingContainer}>{children}</main>
//       </div>

//       {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}

//       <Modal
//         title={t("logout.title")}
//         closable={{ "aria-label": "Custom Close Button" }}
//         open={isModalOpen}
//         onOk={handleOk}
//         onCancel={handleCancel}
//         okText={t("logout.ok")}
//         cancelText={t("logout.cancel")}
//         styles={{ mask: { zIndex: 1000 } }}
//       />
//     </div>
//   );
// }




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
  FaAtom,
  FaClipboardCheck,
  FaCalendarAlt,
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
import { Avatar } from "@mui/material";

import {
  ReturnedAnnouncementData,
  ReturnedExamData,
  ReturnedSubjectData,
  SearchKind,
} from "./interface";

import { useTranslations } from "next-intl";
import { getDropdownItems } from "./utils";
import LanguageSwitcher from "../components/LanguageSwitcher/LanguageSwitcher";

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
  const t = useTranslations("Layout");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMe, setUserMe] = useState<UserMeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [options, setOptions] = useState<SearchAutoOption[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>("");

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

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const showModal = () => setIsModalOpen(true);

  const handleLogout = async () => {
    try {
      await api.post("/user/logout/", { refresh: Cookies.get("refresh") });
    }
    catch (err: unknown) {
      console.log("Logout failed:", err);
    }
    finally {
      Cookies.remove("access");
      Cookies.remove("refresh");
      router.push(`/${locale}/login`);
    }
  };

  const handleOk = () => {
    setIsModalOpen(false);
    handleLogout();
  };

  const handleCancel = () => setIsModalOpen(false);

  const onDropdownClick = ({ key }: { key: string }) => {
    if (key === "logout") showModal();
    if (key === "profile") router.push(`/${locale}/profile`);
  };

  const isActive = (href: string) => {
    const cleanHref = href.replace(`/${locale}`, "") || "/";

    if (cleanHref === "/home") return cleanPath === "/home" || cleanPath === "/";
    return cleanPath === cleanHref || cleanPath.startsWith(cleanHref + "/");
  };

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

    ...(userMe?.role === "teacher" || userMe?.role === "admin"
      ? [
        {
          href: `/${locale}/attendance`,
          label: t("nav.attendance"),
          icon: <FaClipboardCheck className={styles.navIcon} />,
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

    ...(userMe?.role !== "teacher" && userMe?.role !== "admin"
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
        (s: ReturnedSubjectData) => ({
          value: `subject:${s.pk}`,
          label: `📚 ${t("search.subject")}: ${s.name}`,
          kind: "subject",
          id: s.pk,
        })
      );

      const exams: SearchAutoOption[] = (res.data?.exams ?? []).map(
        (e: ReturnedExamData) => ({
          value: `exam:${e.pk}`,
          label: `📝 ${t("search.exam")}: ${e.title}`,
          kind: "exam",
          id: e.pk,
        })
      );

      const announcements: SearchAutoOption[] = (res.data?.announcements ?? []).map(
        (a: ReturnedAnnouncementData) => {
          const title = getTitleFromAnnouncement(a);
          const short = title.slice(0, 60) + (title.length > 60 ? "..." : "");

          return {
            value: `announcement:${a.pk}`,
            label: `📣 ${t("search.announcement")}: ${short || t("search.untitled")}`,
            kind: "announcement",
            id: a.pk,
          };
        }
      );

      setOptions([...subjects, ...exams, ...announcements]);
    }
    catch {
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

    if (kind === "subject") router.push(`/${locale}/subject/${id}`);
    if (kind === "exam") router.push(`/${locale}/exam/${id}/start`);
    if (kind === "announcement") router.push(`/${locale}/announcement/${id}`);

    setOptions([]);
  };

  const handleBlur = () => {
    setTimeout(() => setOptions([]), 150);
  };

  return (
    <div className={styles.layoutMainContainer}>
      <nav className={`${styles.navBar} ${sidebarOpen ? styles.navBarOpen : ""}`}>
        <div className={styles.mainLogoContainer}>
          <FaSchool className={styles.schoolIcon} /> <span>{t("school")}</span>
        </div>

        <div className={styles.middleWrapper}>
          <div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.redirectionCaptions} ${isActive(item.href) ? styles.activeLink : ""
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

          <LanguageSwitcher />
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
                  onChange={setSearchValue}
                  onSelect={handleSelect}
                  filterOption={false}
                  classNames={{ popup: { root: styles.searchDropdown } }}
                  className={styles.searchInput}
                >
                  <Input.Search
                    placeholder={t("search.placeholder")}
                    enterButton
                    onSearch={(v) => fetchSearch(v)}
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

        <main className={styles.childrenPassingContainer}>{children}</main>
      </div>

      {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}

      <Modal
        title={t("logout.title")}
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={t("logout.ok")}
        cancelText={t("logout.cancel")}
        styles={{ mask: { zIndex: 1000 } }}
      />
    </div>
  );
}