'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { FaBars, FaHome, FaTrophy, FaFileAlt, FaBookOpen, FaSchool, FaBullhorn } from 'react-icons/fa';
import styles from './MainLayout.module.scss';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Dropdown, Space } from 'antd';
import api from '@/interceptors';
import { UserMeData } from './profile/interface';
import { AxiosError, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

export default function MainLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMe, setUserMe] = useState<UserMeData | null>(null);
  const pathname = usePathname();
  const router = useRouter();



  useEffect(() => {
    setSidebarOpen(false);
    api.get<UserMeData>('user/me/')
      .then((res: AxiosResponse<UserMeData>) => setUserMe(res.data))
      .catch((err: AxiosError) => console.log(err.message));
  }, [pathname]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);


  const onDropdownClick = ({ key }: { key: string }) => { if (key === 'logout') handleLogout() }


  const handleLogout = async () => {
    try {
      await api.post("/user/logout/", { refresh: Cookies.get('refresh') });
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


  const dropdownItems = [
    {
      key: 'profile',
      label: <Link href="/profile">Profile</Link>,
    },
    {
      key: 'logout',
      danger: true,
      label: 'Logout',
    },
  ];



  return (
    <div className={styles.layoutMainContainer}>
      <nav className={`${styles.navBar} ${sidebarOpen ? styles.navBarOpen : ''}`}>
        <div className={styles.mainLogoContainer}>
          <FaSchool className={styles.schoolIcon} /> My School
        </div>

        <Link className={styles.redirectionCaptions} href="/home">
          <div className={styles.pageRedirectionWrapper}>
            <FaHome className={styles.navIcon} /> Home
          </div>
        </Link>

        <Link className={styles.redirectionCaptions} href="/announcement">
          <div className={styles.pageRedirectionWrapper}>
            <FaBullhorn className={styles.navIcon} /> Announcement
          </div>
        </Link>

        <Link className={styles.redirectionCaptions} href="/leader-board">
          <div className={styles.pageRedirectionWrapper}>
            <FaTrophy className={styles.navIcon} /> Leader-board
          </div>
        </Link>

        <Link className={styles.redirectionCaptions} href="/exercise">
          <div className={styles.pageRedirectionWrapper}>
            <FaBookOpen className={styles.navIcon} /> Exercise
          </div>
        </Link>

        <Link className={styles.redirectionCaptions} href="/exam">
          <div className={styles.pageRedirectionWrapper}>
            <FaFileAlt className={styles.navIcon} /> Exam
          </div>
        </Link>
      </nav>




      <div className={styles.headerAndMainWrapper}>
        <header className={styles.headerSection}>
          <FaBars className={styles.burgerIcon} onClick={toggleSidebar} />

          <div className={styles.myProfileWrapper}>
            <Dropdown trigger={['click']} menu={{ items: dropdownItems, onClick: onDropdownClick }} placement="bottomRight">
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <div className={styles.outerWrapperProfile}>
                    <span>{userMe?.first_name} {userMe?.last_name}</span>
                    <div className={styles.profilePictureWrapper}>
                      <Image src="/profile.png" width={40} height={40} alt="Profile Picture" />
                    </div>
                  </div>
                </Space>
              </a>
            </Dropdown>
          </div>
        </header>

        <main className={styles.childrenPassingContainer}>{children}</main>
      </div>




      {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
    </div>
  );
}