// components/ui2/alert.tsx
import * as React from "react";
import { cn } from "../../lib/utils";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiX,
  FiXCircle,
} from "react-icons/fi";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  icon?: React.ReactNode;
  heading?: React.ReactNode;       // ✅ renamed
  description?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  showIcon?: boolean;
  showBorder?: boolean;
  accent?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "default",
      icon,
      title,
      description,
      dismissible = false,
      onDismiss,
      showIcon = true,
      showBorder = false,
      accent = false,
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);

    const variants = {
      default:
        "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300",
      destructive:
        "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-300",
      success:
        "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300",
      warning:
        "bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300",
      info: "bg-cyan-50 text-cyan-900 dark:bg-cyan-900/20 dark:text-cyan-300",
    };

    const borderVariants = {
      default: "border-l-4 border-blue-500 dark:border-blue-400",
      destructive: "border-l-4 border-red-500 dark:border-red-400",
      success: "border-l-4 border-green-500 dark:border-green-400",
      warning: "border-l-4 border-yellow-500 dark:border-yellow-400",
      info: "border-l-4 border-cyan-500 dark:border-cyan-400",
    };

    const iconVariants = {
      default: <FiInfo className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
      destructive: (
        <FiXCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
      ),
      success: (
        <FiCheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
      ),
      warning: (
        <FiAlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
      ),
      info: <FiInfo className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
    };

    const accentClasses = {
      default:
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-blue-500",
      destructive:
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-red-500",
      success:
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-green-500",
      warning:
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-yellow-500",
      info: "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-cyan-500",
    };

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative rounded-xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
          variants[variant],
          showBorder && borderVariants[variant],
          accent && accentClasses[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {showIcon && (
            <div className="flex-shrink-0 mt-0.5">
              {icon || iconVariants[variant]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {title && (
              <h5 className={cn("font-semibold mb-1", description && "mb-2")}>
                {title}
              </h5>
            )}

            {description && (
              <div className="text-sm opacity-90 leading-relaxed">
                {description}
              </div>
            )}

            {children && !description && <div className="mt-2">{children}</div>}
          </div>

          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 ml-4 -mt-1 -mr-2 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
