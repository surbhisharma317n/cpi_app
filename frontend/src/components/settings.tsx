import { useState, useRef, useEffect, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, EyeOffIcon } from "lucide-react";
import { TbEyeBitcoin, TbEyeDiscount } from "react-icons/tb";
import Profile from "./auth/profile";

/* ---------------- TYPES ---------------- */

type Preferences = {
  darkMode: boolean;
  emailNotifications: boolean;
};

export interface SettingsPayload {
  fullName: string;
  email: string;
  preferences: Preferences;
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SettingsPayload) => void;
  initial: SettingsPayload;
}

/* ---------------- COMPONENT ---------------- */

export default function Settings({
  isOpen,
  onClose,
  onSave,
  initial,
}: SettingsProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<"account" | "reset-password" | "prefs">(
    "account"
  );
  const [form, setForm] = useState(initial);
  const [passwords, setPasswords] = useState({ current: "", new: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  /* Close ESC */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  /* Lock scroll */
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form);
    setPasswords({ current: "", new: "" });
    onClose();
  };

  /* ---------------- UI ---------------- */

  const TabButton = ({ id, label }: { id: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
        tab === id
          ? "bg-blue-600 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

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
            onClick={(e) =>
              e.target === backdropRef.current && onClose()
            }
          />

          {/* Drawer */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="
              fixed right-0 top-0 z-50
              h-full w-full max-w-md
              bg-white shadow-2xl
              flex flex-col
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                Settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 py-3 border-b bg-gray-50">
              <TabButton id="account" label="Account" />
              <TabButton id="reset-password" label="Password" />
              <TabButton id="prefs" label="Preferences" />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {tab === "account" && <Profile />}

              {tab === "reset-password" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Reset Password
                    </h3>
                    <p className="text-sm text-gray-500">
                      Keep your account secure
                    </p>
                  </div>

                  {/* Current Password */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={passwords.current}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            current: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-2.5"
                      >
                        {showCurrent ? (
                          <EyeOffIcon size={18} />
                        ) : (
                          <TbEyeBitcoin size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={passwords.new}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            new: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-2.5"
                      >
                        {showNew ? (
                          <EyeOffIcon size={18} />
                        ) : (
                          <TbEyeDiscount size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "prefs" && (
                <div className="space-y-4">
                  <Toggle
                    label="Dark Mode"
                    checked={form.preferences.darkMode}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        preferences: {
                          ...form.preferences,
                          darkMode: val,
                        },
                      })
                    }
                  />
                  <Toggle
                    label="Email Notifications"
                    checked={form.preferences.emailNotifications}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        preferences: {
                          ...form.preferences,
                          emailNotifications: val,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                <Check size={16} /> Save
              </button>
            </div>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- HELPER ---------------- */

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 text-blue-600"
      />
    </div>
  );
}
