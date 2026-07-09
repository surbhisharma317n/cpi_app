import React, { useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ---------------- Context ---------------- */
type TabsContextType = {
  value: string;
  setValue: (val: string) => void;
  variant?: "pill" | "underline" | "solid";
  size?: "sm" | "md" | "lg";
};

const TabsContext = createContext<TabsContextType | null>(null);

/* ---------------- Tabs ---------------- */
type TabsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  variant?: "pill" | "underline" | "solid";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
};

export const Tabs: React.FC<TabsProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  variant = "pill",
  size = "md",
  children,
}) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");

  const value = isControlled ? controlledValue : internalValue;

  const setValue = (val: string) => {
    if (!isControlled) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value, setValue, variant, size }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
};

/* ---------------- TabsList ---------------- */
export const TabsList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    className="
      flex items-center gap-2 p-2 rounded-xl
      overflow-x-auto no-scrollbar
      bg-gray-50 dark:bg-gray-800
    "
  >
    {children}
  </div>
);

/* ---------------- TabsTrigger ---------------- */
export const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ value, children, icon }) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");

  const { variant, size } = ctx;
  const isActive = ctx.value === value;

  const sizeStyles = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base",
  };

  const base =
    "relative flex items-center gap-2 rounded-md font-medium transition-all duration-200 whitespace-nowrap";

  const variants = {
    pill: isActive
      ? "bg-blue-600 text-white shadow-sm"
      : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-gray-700 dark:text-gray-200",
    solid: isActive
      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
    underline:
      "bg-transparent text-gray-600 dark:text-gray-300 hover:text-blue-600",
  };

  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={`${base} ${sizeStyles[size!]} ${variants[variant!]}`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}

      {/* Underline animation */}
      <AnimatePresence>
        {isActive && variant === "underline" && (
          <motion.div
            layoutId="tab-indicator"
            className="absolute -bottom-1 left-0 right-0 h-[2px] bg-blue-600 rounded-full"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
      </AnimatePresence>
    </button>
  );
};

/* ---------------- TabsContent ---------------- */
export const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");

  return (
    <AnimatePresence mode="wait">
      {ctx.value === value && (
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="
            mt-4 p-4 rounded-xl border
            bg-white dark:bg-gray-900
            border-gray-200 dark:border-gray-700
          "
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};