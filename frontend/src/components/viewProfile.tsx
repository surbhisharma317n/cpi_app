import { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
} from "lucide-react";

/* ---------------- TYPES ---------------- */

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

export interface User {
  id: string;
  avatar: string;
  fullName: string;
  email: string;
  role?: string;
  phone?: string;
  location?: string;
  joinedAt?: string;
  lastLogin?: string;
  activities?: UserActivity[];
}

interface ViewProfileProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

/* ---------------- COMPONENT ---------------- */

export default function ViewProfile({
  user,
  isOpen,
  onClose,
}: ViewProfileProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  /* Close on ESC */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* Lock body scroll */
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === backdropRef.current) onClose();
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="
              fixed right-0 top-0 z-50
              h-full w-full max-w-md
              bg-white shadow-2xl
              p-6 overflow-y-auto
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                My Profile
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* User Info */}
            <div className="mt-6 flex items-center gap-4">
              <img
                src={user.avatar}
                alt={user.fullName}
                className="w-20 h-20 rounded-full border object-cover"
              />
              <div>
                <p className="text-lg font-semibold text-gray-800">
                  {user.fullName}
                </p>
                {user.role && (
                  <p className="text-sm text-blue-600">{user.role}</p>
                )}
                {user.lastLogin && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last login: {user.lastLogin}
                  </p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-3 text-sm">
              <InfoRow
                icon={<Mail size={16} />}
                label="Email"
                value={user.email}
              />
              {user.phone && (
                <InfoRow
                  icon={<Phone size={16} />}
                  label="Phone"
                  value={user.phone}
                />
              )}
              {user.location && (
                <InfoRow
                  icon={<MapPin size={16} />}
                  label="Location"
                  value={user.location}
                />
              )}
              {user.joinedAt && (
                <InfoRow
                  icon={<Calendar size={16} />}
                  label="Joined"
                  value={user.joinedAt}
                />
              )}
            </div>

            {/* Activity */}
            {user.activities && user.activities.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Recent Activity
                  </h3>
                </div>

                <div className="space-y-2">
                  {user.activities.slice(0, 5).map((act) => (
                    <div
                      key={act.id}
                      className="rounded-lg bg-gray-50 p-3"
                    >
                      <p className="text-sm font-medium text-gray-800">
                        {act.type}
                      </p>
                      <p className="text-xs text-gray-600">
                        {act.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {act.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8">
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- HELPER ---------------- */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-500">{icon}</span>
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-600 break-all">{value}</span>
    </div>
  );
}
