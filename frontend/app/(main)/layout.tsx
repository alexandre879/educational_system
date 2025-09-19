'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { FaBars, FaHome, FaTrophy, FaFileAlt, FaBookOpen, FaSchool, FaBullhorn} from 'react-icons/fa';
import styles from './MainLayout.module.scss';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

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
        </header>
        <main className={styles.childrenPassingContainer}>{children}</main>
      </div>

      {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
    </div>
  );
}