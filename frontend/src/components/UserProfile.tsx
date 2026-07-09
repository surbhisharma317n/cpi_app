import { useState, useRef, useEffect } from "react";
import ViewProfile from "./viewProfile";
import Settings from "./settings";
import { LogoutButton } from "./auth/logout";

import { useAppSelector } from "../app/hooks";
import { selectAuth } from "../features/auth/authSlice";
export type ActivityType =
  | "Login"
  | "Report"
  | "Update"
  | "Data Upload";

  export interface UserActivity {
  id: number;
  type: ActivityType;
  description: string;
  date: string;
}

const activities: UserActivity[] = [
  {
    id: 1,
    type: "Login",
    description: "Logged in to dashboard",
    date: "16 Dec 2025, 09:45 AM",
  },
  {
    id: 2,
    type: "Report",
    description: "Downloaded CPI Monthly Report",
    date: "15 Dec 2025, 06:10 PM",
  },
  {
    id: 3,
    type: "Update",
    description: "Updated profile settings",
    date: "14 Dec 2025, 03:22 PM",
  },
];

// ---------------------------------------------
// User Profile Dropdown (Header Menu)
// ---------------------------------------------
export default function UserProfile() {
  const { user } = useAppSelector(selectAuth);

  const [menuOpen, setMenuOpen] = useState(false);
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------
  // Derived User Data (Single Source of Truth)
  // ---------------------------------------------

console.log(user,"userDetailks===================")
  const userData = {
  id: "u-123",
  avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  fullName: user?.first_name ?? "Amit Kumar",
  email: user?.email ?? "amit@example.com",
  role: user?.role ?? "Admin",
  phone: "+91 98765 43210",
  location: "New Delhi, India",
  joinedAt: "05 Jan 2024",
  lastLogin: "16 Dec 2025, 09:45 AM",
  activities: activities
};

  const userPreferences = {
    darkMode: true,
    emailNotifications: false,
  };

  // ---------------------------------------------
  // Close dropdown on outside click
  // ---------------------------------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ---------------------------------------------
  // Handlers
  // ---------------------------------------------
  const openViewProfile = () => {
    setViewProfileOpen(true);
    setMenuOpen(false);
  };

  const openSettings = () => {
    setSettingsOpen(true);
    setMenuOpen(false);
  };

  // ---------------------------------------------
  // UI
  // ---------------------------------------------
  return (
    <>
      {/* Avatar + Name (Header Trigger) */}
      <div ref={dropdownRef} className="relative inline-block text-left">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 focus:outline-none"
        >
          <div className="relative">
            <img
              className="w-8 h-8 rounded-full border border-gray-300"
              src={userData.avatar}
              alt={userData.fullName}
            />
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-white" />
          </div>

          <div className="text-left">
            <p className="text-sm font-medium text-gray-800 leading-tight">
              {userData.fullName}
            </p>
            <p className="text-xs text-blue-600">{userData.role}</p>
          </div>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl bg-white border shadow-lg">
            <div className="py-2 text-sm text-gray-700">
              <button
                onClick={openViewProfile}
                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
              >
                👤 View Profile
              </button>

              <button
                onClick={openSettings}
                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
              >
                ⚙️ Settings
              </button>

              <div className="my-1 border-t" />

              <div className="px-2">
                <LogoutButton />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Profile Modal */}
      <ViewProfile
        user={userData}
        isOpen={viewProfileOpen}
        onClose={() => setViewProfileOpen(false)}
      />

      {/* Settings Modal */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={() => setSettingsOpen(false)}
        initial={{
          fullName: userData.fullName,
          email: userData.email,
          preferences: userPreferences,
        }}
      />
    </>
  );
}
