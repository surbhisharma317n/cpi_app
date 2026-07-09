// components/ui2/tabs.tsx
import * as React from "react";
import { cn } from "../../lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: "default" | "pills" | "underline";
  size: "sm" | "md" | "lg";
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

const useTabs = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within Tabs");
  }
  return context;
};

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: "default" | "pills" | "underline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      className,
      defaultValue,
      value: controlledValue,
      onValueChange,
      variant = "default",
      size = "md",
      children,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const handleValueChange = (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const contextValue = React.useMemo(
      () => ({
        value,
        onValueChange: handleValueChange,
        variant,
        size,
      }),
      [value, variant, size]
    );

    return (
      <TabsContext.Provider value={contextValue}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";


// ✅ TabsList
const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { fullWidth?: boolean }
>(({ className, fullWidth = false, ...props }, ref) => {
  const { variant, size } = useTabs();

  const variants: Record<TabsContextValue["variant"], string> = {
    default: "bg-gray-100 dark:bg-gray-800 p-1 rounded-lg",
    pills: "space-x-1",
    underline: "border-b border-gray-200 dark:border-gray-800",
  };

  const sizes: Record<TabsContextValue["size"], string> = {
    sm: "h-8",
    md: "h-10",
    lg: "h-12",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
});
TabsList.displayName = "TabsList";


// ✅ TabsTrigger
const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
    icon?: React.ReactNode;
  }
>(({ className, value, icon, children, ...props }, ref) => {
  const { value: selectedValue, onValueChange, variant, size } = useTabs();

  const isSelected = selectedValue === value;

  const triggerVariants: Record<TabsContextValue["variant"], string> = {
    default: cn(
      "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all",
      isSelected
        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
    ),
    pills: cn(
      "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all",
      isSelected
        ? "bg-blue-600 text-white shadow-md"
        : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
    ),
    underline: cn(
      "inline-flex items-center justify-center border-b-2 px-4 py-2 text-sm font-medium transition-all",
      isSelected
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-gray-500 hover:border-gray-300"
    ),
  };

  const sizesClass: Record<TabsContextValue["size"], string> = {
    sm: "h-7 px-2 text-xs",
    md: "h-9 px-3 text-sm",
    lg: "h-11 px-4 text-base",
  };

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isSelected}
      className={cn(
        triggerVariants[variant],
        sizesClass[size],
        "transition-all duration-200",
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";


// ✅ TabsContent
const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const { value: selectedValue } = useTabs();

  if (selectedValue !== value) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn("mt-2", className)}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };