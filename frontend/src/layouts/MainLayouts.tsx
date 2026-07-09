import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { ToastProvider } from '../components/toast_container/ToastProvider';

const RAIL_W = 264; // reference.html rail width
const RAIL_W_COLLAPSED = 76;
const TOPBAR_H = 60;

export default function MainLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleCollapseToggle = () => {
    setIsCollapsed(prev => !prev);
  };

  const railWidth = isCollapsed ? RAIL_W_COLLAPSED : RAIL_W;

  return (
    <div
      className={`flex flex-col min-h-screen w-full m-0 ${darkMode ? 'dark' : ''}`}
      style={{ background: 'var(--bg)' }}
    >
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex w-full min-h-screen">
        {/* ─── Rail (sidebar) ─────────────────────────────────── */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 flex-shrink-0
            transition-all duration-300 ease-in-out
            ${sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ width: railWidth }}
        >
          <Sidebar
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            onClose={() => setSidebarOpen(false)}
            isCollapsed={isCollapsed}
          />
        </aside>

        {/* ─── Main column ─────────────────────────────────────── */}
        <div
          className="flex flex-col w-full min-w-0 transition-all duration-300"
          style={{ marginLeft: isMobile ? 0 : railWidth }}
        >
          {/* Topbar */}
          <header
            className="fixed top-0 right-0 z-40 transition-all duration-300"
            style={{
              left: isMobile ? 0 : railWidth,
              height: TOPBAR_H,
            }}
          >
            <Navbar
              darkMode={darkMode}
              toggleTheme={toggleTheme}
              onMenuToggle={handleSidebarToggle}
              onCollapseToggle={handleCollapseToggle}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
            />
          </header>

          {/* Content */}
          <main
            className="flex-1 overflow-y-auto"
            style={{
              marginTop: TOPBAR_H,
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            <Outlet />
            <ToastProvider />
          </main>

          <Footer darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}
