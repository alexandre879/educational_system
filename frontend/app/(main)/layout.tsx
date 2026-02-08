"use client";

import React, { ReactNode, useEffect, useState } from "react";
import {
  FaBars,
  FaHome,
  FaTrophy,
  FaFileAlt,
  FaBookOpen,
  FaSchool,
  FaBullhorn,
  FaRobot,
} from "react-icons/fa";
import styles from "./MainLayout.module.scss";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Dropdown, Modal, Space, Input, AutoComplete } from "antd";
import api from "@/interceptors";
import { UserMeData } from "./profile/interface";
import { AxiosError, AxiosResponse } from "axios";
import Cookies from "js-cookie";



export default function MainLayout({ children }: { children: ReactNode }) {

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMe, setUserMe] = useState<UserMeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    }
    catch (err) {
      console.log("Logout failed:", err);
    }
    finally {
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

  const dropdownItems = [
    { key: "profile", label: "Profile" },
    { key: "logout", danger: true, label: "Logout" },
  ];


  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navItems = [
    { href: "/home", label: "HOME", icon: <FaHome className={styles.navIcon} /> },
    {
      href: "/announcement",
      label: "ANNOUNCEMENT",
      icon: <FaBullhorn className={styles.navIcon} />,
    },
    {
      href: "/leader-board",
      label: "LEADER BOARD",
      icon: <FaTrophy className={styles.navIcon} />,
    },
    {
      href: "/exercise",
      label: "EXERCISE",
      icon: <FaBookOpen className={styles.navIcon} />,
    },
    { href: "/exam", label: "EXAM", icon: <FaFileAlt className={styles.navIcon} /> },
    {
      href: "/aisupport",
      label: "AI SUPPORT",
      icon: <FaRobot className={styles.navIcon} />,
    },
  ];


  const dataSource = [
    "Math",
    "Physics",
    "Chemistry",
    "Biology",
    "History",
    "Geography",
  ];

  const handleSearch = (value: string) => {
    if (!value) {
      setOptions([]);
      return;
    }

    setOptions(
      dataSource
        .filter(item =>
          item.toLowerCase().includes(value.toLowerCase())
        )
        .map(item => ({ value: item }))
    );
  };


  const [options, setOptions] = useState<{ value: string }[]>([]);

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
              {/* <Input.Search className={styles.searchInput} placeholder="input search text" onSearch={() => {}} enterButton /> */}
              <div className={styles.searchBarComponent} >
                <AutoComplete
                  options={options}
                  onSearch={handleSearch}
                  onSelect={(value) => {
                    console.log("Selected:", value);
                  }}
                  className={styles.searchInput}
                >
                  <Input.Search
                    placeholder="Search subject..."
                    enterButton
                  />
                </AutoComplete>
              </div>
              <Dropdown
                trigger={["click"]}
                menu={{ items: dropdownItems, onClick: onDropdownClick }}
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
                            style={{ width: 40, height: 50 }}
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

      {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}

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