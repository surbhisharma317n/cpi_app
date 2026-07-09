import React, { useState, createContext, useContext } from "react";


// Types
type TabsContextType = {
  value: string;
  setValue: (val: string) => void;
};

const TabsContext = createContext<TabsContextType | null>(null);

type TabsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
};

export const Tabs: React.FC<TabsProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
}) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");

  const value = isControlled ? controlledValue : internalValue;

  const setValue = (val: string) => {
    if (!isControlled) setInternalValue(val);
    if (onValueChange) onValueChange(val);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

// --- TabsList ---
// export const TabsList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
//   <div
//     className="
//       flex gap-2  dark:bg-gray-800 p-2 rounded-xl
//       overflow-x-auto whitespace-nowrap no-scrollbar
//       items-center
//     "
//   >
//     {children}
//   </div>
// );
type TabsListProps = {
  children: React.ReactNode;
  className?: string;
};

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className = "",
}) => (
  <div
    className={`flex gap-3 p-2 bg-gray-100 rounded-2xl overflow-x-auto no-scrollbar ${className}`}
  >
    {children}
  </div>
);

// --- TabsTrigger ---
// export const TabsTrigger: React.FC<{
//   value: string;
//   children: React.ReactNode;
// }> = ({ value, children }) => {
//   const ctx = useContext(TabsContext);
//   if (!ctx) throw new Error("TabsTrigger must be used within Tabs");

//   const isActive = ctx.value === value;
//   const isRural = value.toLowerCase().includes("rural");

//   return (
//     <button
//       onClick={() => ctx.setValue(value)}
//       className={`
//         relative flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium
//         transition-colors duration-150 whitespace-nowrap
//         ${
//           isRural
//             ? "bg-yellow-50 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-800/40"
//             : "bg-blue-50 hover:bg-blue-200 dark:bg-gray-900 dark:hover:bg-gray-700"
//         }
//         text-gray-700 dark:text-gray-200
//       `}
//     >
//       <span
//         className={
//           isActive
//             ? "text-blue-600 dark:text-blue-400 font-semibold"
//             : ""
//         }
//       >
//         {children}
//       </span>

//       <AnimatePresence>
//         {isActive && (
//           <motion.div
//             layoutId="tab-underline"
//             className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400 rounded-full"
//             transition={{ type: "spring", stiffness: 300, damping: 30 }}
//           />
//         )}
//       </AnimatePresence>
//     </button>
//   );
// };

type TabsTriggerProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className = "",
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = ctx.value === value;

  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={`
  relative flex-shrink-0 px-4 py-2 text-sm font-medium
  transition-all duration-300 whitespace-nowrap
  border-b-2
  ${
    isActive
      ? "text-[#1776C8] border-[#1776C8] border-b-[3px]"
      : "text-gray-500 border-transparent hover:border-gray-300"
  }
  ${className}
`}
    >
      <span className={isActive ? "font-semibold flex items-center gap-2" : "flex items-center gap-2"}>
        {children}
      </span>
    </button>
  );
};

// --- TabsContent ---
// export const TabsContent: React.FC<{
//   value: string;
//   children: React.ReactNode;
// }> = ({ value, children }) => {
//   const ctx = useContext(TabsContext);
//   if (!ctx) throw new Error("TabsContent must be used within Tabs");

//   return ctx.value === value ? (
//     <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
//       {children}
//     </div>
//   ) : null;
// };

type TabsContentProps = {
  value: string;
  children: React.ReactNode;
};

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");

  if (ctx.value !== value) return null;

  return (
    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      {children}
    </div>
  );
};
