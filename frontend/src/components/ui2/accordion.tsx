// components/ui2/accordion.tsx
import * as React from "react";
import { cn } from "../../lib/utils";
import { FiChevronDown, FiChevronRight, FiPlus, FiMinus } from "react-icons/fi";

interface AccordionContextValue {
  type: "single" | "multiple";
  collapsible: boolean;
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  variant: "default" | "bordered" | "ghost" | "shadow";
  size: "sm" | "md" | "lg";
  iconPosition: "left" | "right";
  iconVariant: "chevron" | "plus" | "plus-circle" | "arrow";
  animated: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(
  null
);

const useAccordion = () => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
};

// Main Accordion Component
interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  variant?: "default" | "bordered" | "ghost" | "shadow";
  size?: "sm" | "md" | "lg";
  iconPosition?: "left" | "right";
  iconVariant?: "chevron" | "plus" | "plus-circle" | "arrow";
  animated?: boolean;
  keepMounted?: boolean;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      className,
      type = "single",
      defaultValue,
      value: controlledValue,
      onValueChange,
      collapsible = false,
      variant = "default",
      size = "md",
      iconPosition = "right",
      iconVariant = "chevron",
      animated = true,
      keepMounted = false,
      children,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      type === "multiple" ? defaultValue || [] : defaultValue || ""
    );

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    const handleValueChange = React.useCallback(
      (newValue: string | string[]) => {
        if (!isControlled) {
          setInternalValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange]
    );

    const contextValue = React.useMemo(
      () => ({
        type,
        collapsible,
        value: currentValue,
        onValueChange: handleValueChange,
        variant,
        size,
        iconPosition,
        iconVariant,
        animated,
      }),
      [
        type,
        collapsible,
        currentValue,
        handleValueChange,
        variant,
        size,
        iconPosition,
        iconVariant,
        animated,
      ]
    );

    return (
      <AccordionContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            "w-full space-y-2",
            variant === "shadow" &&
              "rounded-xl shadow-lg p-4 bg-white dark:bg-gray-900",
            className
          )}
          {...props}
        >
          {React.Children.map(children, (child, index) => {
  if (!React.isValidElement(child)) return child;

  return React.cloneElement(
    child as React.ReactElement<any>,
    {
      ...(child.props as object),
      index,
      keepMounted,
      _variant: variant,
      _size: size,
    }
  );
})}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";



// Accordion Item
interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  index?: number;
  keepMounted?: boolean;
  disabled?: boolean;
  _variant?: string;
  _size?: string;
}


const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  (
    {
      className,
      value,
      index,
      keepMounted = false,
      disabled = false,
      _variant,
      _size,
      children,
      ...props
    },
    ref
  ) => {
    const {
      type,
      value: currentValue,
      variant = _variant,
      size = _size,
    } = useAccordion();

    const isOpen =
      type === "multiple"
        ? Array.isArray(currentValue) && currentValue.includes(value)
        : currentValue === value;

    const variants = {
      default: "rounded-lg border border-gray-200 dark:border-gray-800",
      bordered: "border-b border-gray-200 dark:border-gray-800 last:border-b-0",
      ghost: "hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg",
      shadow: "shadow-sm rounded-lg",
    };

    const sizes = {
      sm: "py-2",
      md: "py-3",
      lg: "py-4",
    };

    return (
      <div
        ref={ref}
        data-state={isOpen ? "open" : "closed"}
        data-disabled={disabled ? "true" : "false"}
        className={cn(
          "overflow-hidden transition-all duration-200",
          variants[variant as keyof typeof variants],
          sizes[size as keyof typeof sizes],
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
  if (!React.isValidElement(child)) return child;

  return React.cloneElement(
    child as React.ReactElement<any>,
    {
      ...(child.props as object),
      index,
      keepMounted,
      _variant: variant,
      _size: size,
    }
  );
})}
      </div>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

// Accordion Trigger
interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
  isOpen?: boolean;
  disabled?: boolean;
  showIcon?: boolean;
  customIcon?: React.ReactNode;
  badge?: React.ReactNode;
}

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(
  (
    {
      className,
      value,
      isOpen = false,
      disabled = false,
      showIcon = true,
      customIcon,
      badge,
      children,
      ...props
    },
    ref
  ) => {
    const {
      type,
      value: currentValue,
      onValueChange,
      collapsible,
      variant,
      size,
      iconPosition,
      iconVariant,
      animated,
    } = useAccordion();

    const handleClick = () => {
      if (disabled || !value) return;

      if (type === "multiple") {
        const currentArray = Array.isArray(currentValue) ? currentValue : [];
        const newValue = currentArray.includes(value)
          ? currentArray.filter((v) => v !== value)
          : [...currentArray, value];
        onValueChange(newValue);
      } else {
        const newValue = currentValue === value && collapsible ? "" : value;
        onValueChange(newValue);
      }
    };

    const getIcon = () => {
      if (customIcon) return customIcon;

      const iconSize = {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
      }[size];

      const iconClasses = cn(
        "flex-shrink-0 transition-transform duration-300",
        isOpen && "rotate-180",
        iconSize
      );

      switch (iconVariant) {
        case "plus":
          return isOpen ? (
            <FiMinus className={iconClasses} />
          ) : (
            <FiPlus className={iconClasses} />
          );
        case "plus-circle":
          return (
            <div className={cn("relative", iconSize)}>
              <div className="absolute inset-0 rounded-full bg-gray-100 dark:bg-gray-800" />
              {isOpen ? (
                <FiMinus className={cn("absolute inset-0", iconSize)} />
              ) : (
                <FiPlus className={cn("absolute inset-0", iconSize)} />
              )}
            </div>
          );
        case "arrow":
          return (
            <FiChevronRight
              className={cn(iconClasses, isOpen && "rotate-90")}
            />
          );
        case "chevron":
        default:
          return <FiChevronDown className={iconClasses} />;
      }
    };

    const sizes = {
      sm: "px-3 text-sm",
      md: "px-4 text-base",
      lg: "px-6 text-lg",
    };

    const variants = {
      default: cn(
        "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        isOpen && "bg-gray-50 dark:bg-gray-800/50"
      ),
      bordered: "hover:bg-gray-50 dark:hover:bg-gray-800/50",
      ghost: cn(
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        isOpen && "bg-gray-100 dark:bg-gray-800"
      ),
      shadow: "hover:bg-gray-50 dark:hover:bg-gray-800/50",
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between gap-3 font-medium",
          "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          sizes[size as keyof typeof sizes],
          variants[variant as keyof typeof variants],
          disabled && "cursor-not-allowed opacity-60",
          animated && "active:scale-[0.98]",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showIcon && iconPosition === "left" && (
            <span className="flex-shrink-0">{getIcon()}</span>
          )}

          <div className="flex-1 text-left truncate">{children}</div>

          {badge && <span className="flex-shrink-0 ml-2">{badge}</span>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showIcon && iconPosition === "right" && (
            <span className="flex-shrink-0">{getIcon()}</span>
          )}
        </div>
      </button>
    );
  }
);
AccordionTrigger.displayName = "AccordionTrigger";

// Accordion Content
interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  isOpen?: boolean;
  keepMounted?: boolean;
  animate?: boolean;
}

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(
  (
    {
      className,
      value,
      isOpen = false,
      keepMounted = false,
      animate = true,
      children,
      ...props
    },
    ref
  ) => {
    const { size, animated } = useAccordion();
    const shouldAnimate = animated && animate;
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [height, setHeight] = React.useState<number | string>(0);
    const [isMounted, setIsMounted] = React.useState(isOpen);

React.useEffect(() => {
  if (!shouldAnimate) {
    setHeight(isOpen ? "auto" : 0);
    setIsMounted(isOpen || keepMounted);
    return;
  }

  if (isOpen) {
    setIsMounted(true);
    requestAnimationFrame(() => {
      const element = contentRef.current;
      if (element) {
        setHeight(element.scrollHeight);
      }
    });
  } else {
    const element = contentRef.current;
    if (element) {
      setHeight(element.scrollHeight);
      requestAnimationFrame(() => {
        setHeight(0);
        setTimeout(() => {
          if (!keepMounted) setIsMounted(false);
        }, 300);
      });
    }
  }
}, [isOpen, keepMounted, shouldAnimate]);

    const sizes = {
      sm: "px-3 pb-3 text-sm",
      md: "px-4 pb-4 text-base",
      lg: "px-6 pb-6 text-lg",
    };

    if (!isMounted && !keepMounted) return null;

    return (
      <div
        ref={ref}
        data-state={isOpen ? "open" : "closed"}
        style={{
          height: animate ? height : undefined,
          overflow: "hidden",
        }}
        className={cn(
          "transition-all duration-300 ease-in-out",
          animate && "overflow-hidden",
          className
        )}
        {...props}
      >
        <div
          ref={contentRef}
          className={cn(sizes[size as keyof typeof sizes], "pt-2")}
        >
          {children}
        </div>
      </div>
    );
  }
);
AccordionContent.displayName = "AccordionContent";

// Accordion Header (Optional wrapper for better semantics)
interface AccordionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const AccordionHeader = React.forwardRef<HTMLDivElement, AccordionHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("font-semibold", className)} {...props}>
        {children}
      </div>
    );
  }
);
AccordionHeader.displayName = "AccordionHeader";

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionHeader,
};
