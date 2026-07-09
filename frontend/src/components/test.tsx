import { Link, useLocation } from "react-router-dom";
import {
  FiUsers,
  FiFileText,
  FiUpload,
  FiCode,
  FiHome,
  FiSettings,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight
} from "react-icons/fi";
import React, { useState } from "react";

interface MenuItem {
  path: string;
  name: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

interface SidebarProps {
  darkMode: boolean;
  toggleTheme: () => void;
  onClose?: () => void;
}

export default function Sidebar({ darkMode, toggleTheme, onClose }: SidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const menuItems: MenuItem[] = [
    { path: "/", name: "Dashboard", icon: <FiHome className="mr-2" /> },
    {
      path: "/users",
      name: "User Management",
      icon: <FiUsers className="mr-2" />,
    },
    {
      path: "/reports",
      name: "Reports",
      icon: <FiFileText className="mr-2" />,
    },
    { path: "/upload", name: "Data", icon: <FiUpload className="mr-2" /> },
    { 
      path: "/compile", 
      name: "Compile", 
      icon: <FiCode className="mr-2" />,
      children: [
        {
          path: "/compile/approval",
          name: "Approval",
          icon: <FiCheckCircle className="mr-2" />,
        },
        // Add more child items if needed
      ]
    },
    {
      path: "/settings",
      name: "Settings",
      icon: <FiSettings className="mr-2" />,
    },
  ];

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const isActive = (path: string) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  const linkClasses = (path: string, isChild = false) => {
    const active = isActive(path);
    return `flex items-center px-4 py-3 rounded-lg transition-colors ${
      active
        ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
    } ${isChild ? 'ml-2 pl-8' : ''}`;
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.path];

    return (
      <div key={item.path} className="space-y-1">
        <Link
          to={item.path}
          className={linkClasses(item.path, isChild)}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpand(item.path);
            }
          }}
        >
          <div className="flex items-center w-full">
            {item.icon}
            <span className="ml-2">{item.name}</span>
            {hasChildren && (
              <span className="ml-auto">
                {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
              </span>
            )}
          </div>
        </Link>

        {hasChildren && isExpanded && (
          <div className="ml-4 space-y-1">
            {item.children?.map(child => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`h-screen flex flex-col relative main_sidebar ${
      darkMode ? "bg-gray-800" : "bg-white"
    } border-r ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
      
      {/* Top */}
      <div className="p-4 flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
          Menu
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Title */}
      <div className={`p-4 text-xl font-bold border-b ${
        darkMode ? "border-gray-700 text-white" : "border-gray-200 text-gray-800"
      }`}>
        My Dashboard
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1 overflow-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Theme Toggle */}
      <div className="absolute bottom-4 left-4">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${
            darkMode
              ? "bg-gray-700 text-yellow-300"
              : "bg-gray-100 text-gray-700"
          }`}
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}