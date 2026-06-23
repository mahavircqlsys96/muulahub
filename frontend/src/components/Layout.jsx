import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth >= 992);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 🔁 Handle resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 992) {
        setIsSidebarVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 🔁 Toggle sidebar (Mobile: Visibility, Desktop: Collapse)
  const toggleSidebar = () => {
    if (windowWidth < 992) {
      setIsSidebarVisible(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

  // ❌ Close sidebar
  const closeSidebar = () => {
    setIsSidebarVisible(false);
  };

  const handleLinkClick = () => {
    if (windowWidth < 992) {
      closeSidebar();
    }
  };

  return (
    <div className="parkez-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ================= SIDEBAR ================= */}
      <div
        className={`parkez-layout__sidebar-wrap ${isSidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          width: windowWidth < 992 ? '280px' : (isSidebarCollapsed ? '80px' : '260px'),
          position: windowWidth < 992 ? 'fixed' : 'relative',
          left: windowWidth < 992 && !isSidebarVisible ? '-280px' : '0',
          top: 0,
          zIndex: 2000,
          height: '100vh',
          transition: 'width 0.3s ease, left 0.3s ease',
          boxShadow: windowWidth < 992 && isSidebarVisible ? '10px 0 30px rgba(0,0,0,0.5)' : 'none',
          overflow: 'hidden'
        }}
      >
        <Sidebar handleLinkClick={handleLinkClick} isCollapsed={isSidebarCollapsed} />
      </div>

      {/* ================= OVERLAY (MOBILE) ================= */}
      {isSidebarVisible && windowWidth < 992 && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1500,
          }}
        />
      )}

      {/* ================= MAIN CONTENT ================= */}
      <div
        className="parkez-layout__main"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Navbar */}
        <Navbar
          toggleSidebar={toggleSidebar}
          closeSidebar={closeSidebar}
          windowWidth={windowWidth}
        />

        {/* Page Content */}
        <div
          className="parkez-layout__scroll"
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            width: '100%',
            background: '#f3f4f6'
          }}
        >
          <Outlet />
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;