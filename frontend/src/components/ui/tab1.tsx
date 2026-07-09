// Tabs.tsx
import React, { createContext, useContext, useState, type ReactNode } from "react";

interface TabsContextProps {
  value: string;
  setValue: (val: string) => void;
}

const TabsContext = createContext<TabsContextProps | undefined>(undefined);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className = "",
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = value ?? internalValue;

  const setValue = (val: string) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={`flex flex-col ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

// TabsList
export const TabsList: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return <div className={`flex border-b border-gray-200 ${className}`}>{children}</div>;
};

// TabsTrigger
interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className = "" }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const { value: currentValue, setValue } = context;
  const isActive = currentValue === value;

  return (
    <button
      onClick={() => setValue(value)}
      className={`
        relative px-4 py-2 font-medium transition-colors duration-300
        ${isActive ? "text-blue-600" : "text-gray-600 hover:text-blue-500"}
        ${className}
      `}
    >
      {children}
      {/* Active underline */}
      <span
        className={`
          absolute left-0 bottom-0 w-full h-1 rounded-t-full transition-all duration-300
          ${isActive ? "bg-blue-600" : "bg-transparent"}
        `}
      ></span>
    </button>
  );
};

// TabsContent
interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = "" }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  const { value: currentValue } = context;

  if (currentValue !== value) return null;

  return <div className={`mt-4 ${className}`}>{children}</div>;
};
