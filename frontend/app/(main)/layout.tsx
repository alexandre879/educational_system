'use client'

import React, { ReactNode, useState, useEffect } from 'react';
import { FaBars, FaHome, FaUser, FaCog, FaBell } from 'react-icons/fa';
import styles from './MainLayout.module.scss';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className={styles.mainLayout}>
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''} ${isMobile ? styles.mobile : ''}`}
      >
        <div className={styles.logo}>
          {sidebarOpen ? 'My App' : 'App'}
        </div>
        <nav className={styles.nav}>
          <button><FaHome /> {sidebarOpen && 'Home'}</button>
          <button><FaUser /> {sidebarOpen && 'Profile'}</button>
          <button><FaCog /> {sidebarOpen && 'Settings'}</button>
        </nav>
      </aside>

      {/* Main Area */}
      <div className={styles.mainArea}>
        {/* Header */}
        <header className={styles.header}>
          <button className={styles.menuBtn} onClick={toggleSidebar}>
            <FaBars />
          </button>
          <div className={styles.headerTitle}>Dashboard</div>
          <div className={styles.headerRight}>
            <FaBell className={styles.bellIcon} />
            <div className={styles.avatar}>A</div>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          {children}
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          © 2025 My Application. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;