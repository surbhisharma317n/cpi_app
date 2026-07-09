import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

/* ----------------------------------------------------
 * Types
 * -------------------------------------------------- */

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  group?: string;
}

export interface SelectProps<T extends string = string>
  extends Omit<
    React.ComponentPropsWithoutRef<"button">,
    "value" | "onChange" | "disabled"
  > {
  value?: T;
  onValueChange?: (value: T) => void;
  options?: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  success?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost" | "filled";
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  groups?: string[];
  emptyMessage?: string;
  showCheckmark?: boolean;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

/* ----------------------------------------------------
 * Context
 * -------------------------------------------------- */

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

/* ----------------------------------------------------
 * Select Root (FIXED)
 * -------------------------------------------------- */

export function Select<T extends string = string>({
  value,
  onValueChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  loading = false,
  error = false,
  errorMessage,
  success = false,
  size = "md",
  variant = "default",
  className,
  triggerClassName,
  contentClassName,
  icon,
  searchable = false,
  groups,
  emptyMessage = "No options available",
  showCheckmark = true,
  align = "start",
  sideOffset = 4,
  ...props
}: SelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !search) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, searchable]);

  React.useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open, searchable]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const sizeClasses = {
    sm: "h-8 text-sm",
    md: "h-10 text-sm",
    lg: "h-12 text-base",
  };

  const variantClasses = {
    default: "border-gray-300 bg-white hover:bg-gray-50",
    outline: "border-gray-300 bg-transparent hover:bg-gray-50",
    ghost: "border-transparent bg-transparent hover:bg-gray-100",
    filled: "border-gray-300 bg-gray-50 hover:bg-gray-100",
  };

  const errorClasses = error ? "border-red-500 focus:ring-red-500/20" : "";
  const successClasses = success ? "border-green-500 focus:ring-green-500/20" : "";
  const disabledClasses = disabled ? "cursor-not-allowed opacity-50" : "";

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: onValueChange as (v: string) => void,
        open,
        setOpen,
        triggerRef,
      }}
    >
      <div className={cn("relative w-full", className)}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || loading}
          aria-expanded={open}
          onClick={() => !disabled && !loading && setOpen(!open)}
          className={cn(
            "flex w-full items-center justify-between rounded-md border px-3 text-left",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            sizeClasses[size],
            variantClasses[variant],
            errorClasses,
            successClasses,
            disabledClasses,
            triggerClassName
          )}
          {...props}
        >
          <span className="flex-1 truncate">
            {loading ? (
              <span className="text-gray-500">Loading...</span>
            ) : selectedOption ? (
              <span className="text-gray-900">{selectedOption.label}</span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>

          {icon && <span className="mr-2">{icon}</span>}

          <ChevronDown
            className={cn(
              "ml-2 h-4 w-4 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {error && errorMessage && (
          <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
        )}

        {open && (
          <div
            ref={contentRef}
            className={cn(
              "absolute z-50 mt-1 w-full min-w-[var(--radix-select-trigger-width)] rounded-md border bg-white shadow-lg",
              contentClassName
            )}
            style={{
              top: "100%",
              left: 0,
              transform: align === "center" ? "translateX(-50%)" : "none",
              marginTop: `${sideOffset}px`,
            }}
          >
            {searchable && (
              <div className="border-b p-2">
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="max-h-64 overflow-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      if (!option.disabled) {
                        onValueChange?.(option.value as T);
                        setOpen(false);
                        setSearch("");
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm",
                      "hover:bg-gray-100",
                      value === option.value && "bg-blue-50 text-blue-600",
                      option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                    )}
                  >
                    <span>{option.label}</span>
                    {showCheckmark && value === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </SelectContext.Provider>
  );
}

/* ----------------------------------------------------
 * Trigger (FIXED - This was causing issues)
 * -------------------------------------------------- */

interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  SelectTriggerProps
>(({ children, open: openProp, onOpenChange: onOpenChangeProp, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  
  const handleClick = () => {
    if (context) {
      const newOpen = openProp ?? !context.open;
      context.setOpen(newOpen);
      onOpenChangeProp?.(newOpen);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={openProp ?? context?.open}
      onClick={handleClick}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border px-3",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
        props.className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

/* ----------------------------------------------------
 * Content (FIXED)
 * -------------------------------------------------- */

interface SelectContentProps
  extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  className?: string;
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  SelectContentProps
>(({ children, className }, ref) => {
  return (
    <div
      ref={ref}
      role="listbox"
      className={cn(
        "absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
});
SelectContent.displayName = "SelectContent";

/* ----------------------------------------------------
 * Item (FIXED)
 * -------------------------------------------------- */

interface SelectItemProps
  extends React.ComponentPropsWithoutRef<"div"> {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, disabled, children, className }, ref) => {
    const context = React.useContext(SelectContext);
    
    const handleClick = () => {
      if (!disabled && context) {
        context.onValueChange?.(value);
        context.setOpen(false);
      }
    };

    const selected = context?.value === value;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={selected}
        onClick={handleClick}
        className={cn(
          "cursor-pointer rounded px-3 py-2 text-sm hover:bg-gray-100",
          selected && "bg-blue-50 text-blue-600",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

/* ----------------------------------------------------
 * Value
 * -------------------------------------------------- */

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  { children?: React.ReactNode; className?: string; placeholder?: string }
>(({ children, className, placeholder }, ref) => (
  <span ref={ref} className={cn("flex-1 truncate text-left", className)}>
    {children || placeholder}
  </span>
));
SelectValue.displayName = "SelectValue";

/* ----------------------------------------------------
 * Exports
 * -------------------------------------------------- */

export {
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
};