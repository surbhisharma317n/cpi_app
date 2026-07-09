// components/ui2/progress.tsx
import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "destructive";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  animated?: boolean;
  striped?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      variant = "default",
      size = "md",
      showValue = false,
      animated = false,
      striped = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variants = {
      default: "bg-blue-600",
      success: "bg-green-600",
      warning: "bg-yellow-500",
      destructive: "bg-red-600",
    };

    const sizes = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    };

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          {showValue && (
            <span className="text-sm font-medium text-gray-700">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
        <div
          ref={ref}
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800",
            sizes[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full w-full flex-1 transition-all duration-300 ease-out",
              variants[variant],
              animated && "animate-pulse",
              striped && "bg-stripe"
            )}
            style={{
              transform: `translateX(-${100 - percentage}%)`,
              transition: "transform 0.4s cubic-bezier(0.65, 0, 0.35, 1)",
            }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
