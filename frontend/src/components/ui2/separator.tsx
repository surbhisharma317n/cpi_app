// components/ui2/separator.tsx
"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "../../lib/utils";

interface SeparatorProps
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  variant?: "default" | "strong" | "subtle" | "gradient" | "dashed" | "dotted";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  labelPosition?: "start" | "center" | "end";
  withIcon?: React.ReactNode;
  inset?: boolean;
  insetSize?: "sm" | "md" | "lg";
  animated?: boolean;
  shadow?: boolean;
  rounded?: boolean;
}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      variant = "default",
      size = "md",
      label,
      labelPosition = "center",
      withIcon,
      inset = false,
      insetSize = "md",
      animated = false,
      shadow = false,
      rounded = false,
      ...props
    },
    ref
  ) => {
    // Size mappings
    const sizeClasses = {
      horizontal: {
        sm: "h-px",
        md: "h-[1px]",
        lg: "h-0.5",
        xl: "h-1",
      },
      vertical: {
        sm: "w-px",
        md: "w-[1px]",
        lg: "w-0.5",
        xl: "w-1",
      },
    };

    // Variant mappings
    const variantClasses = {
      default: "bg-gray-200 dark:bg-gray-700",
      strong: "bg-gray-300 dark:bg-gray-600",
      subtle: "bg-gray-100 dark:bg-gray-800",
      gradient:
        "bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600",
      dashed:
        "bg-transparent border-dashed border-gray-300 dark:border-gray-700",
      dotted:
        "bg-transparent border-dotted border-gray-300 dark:border-gray-700",
    };

    // Inset sizes
    const insetSizes = {
      sm: orientation === "horizontal" ? "mx-2" : "my-2",
      md: orientation === "horizontal" ? "mx-4" : "my-4",
      lg: orientation === "horizontal" ? "mx-6" : "my-6",
    };

    // Animation classes
    const animationClasses = animated
      ? "transition-all duration-300 hover:scale-105 hover:opacity-80"
      : "";

    // Shadow classes
    const shadowClasses = shadow ? "shadow-sm dark:shadow-gray-900/50" : "";

    // Rounded classes
    const roundedClasses = rounded
      ? orientation === "horizontal"
        ? "rounded-full"
        : "rounded-full"
      : "";

    // If there's a label or icon, render the enhanced separator
    if (label || withIcon) {
      return (
        <div
          className={cn(
            "flex items-center",
            orientation === "horizontal" ? "w-full" : "h-full flex-col",
            inset && insetSizes[insetSize],
            className
          )}
        >
          {/* Left/Upper line */}
          <SeparatorPrimitive.Root
            ref={ref}
            decorative={decorative}
            orientation={orientation}
            className={cn(
              "flex-1",
              sizeClasses[orientation][size],
              variant === "dashed" || variant === "dotted"
                ? "border-t" + (orientation === "vertical" ? " border-l" : "")
                : variantClasses[variant],
              animationClasses,
              shadowClasses,
              roundedClasses
            )}
            {...props}
          />

          {/* Label/Icon container */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1",
              orientation === "vertical" && "flex-col px-1 py-3"
            )}
          >
            {withIcon && (
              <div className="text-gray-400 dark:text-gray-500">{withIcon}</div>
            )}
            {label && (
              <span
                className={cn(
                  "text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap",
                  orientation === "vertical" && "transform -rotate-90"
                )}
              >
                {label}
              </span>
            )}
          </div>

          {/* Right/Lower line */}
          <SeparatorPrimitive.Root
            decorative={decorative}
            orientation={orientation}
            className={cn(
              "flex-1",
              sizeClasses[orientation][size],
              variant === "dashed" || variant === "dotted"
                ? "border-t" + (orientation === "vertical" ? " border-l" : "")
                : variantClasses[variant],
              animationClasses,
              shadowClasses,
              roundedClasses
            )}
          />
        </div>
      );
    }

    // Standard separator without label
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          orientation === "horizontal" ? "w-full" : "h-full",
          sizeClasses[orientation][size],
          variant === "dashed" || variant === "dotted"
            ? "border-t" + (orientation === "vertical" ? " border-l" : "")
            : variantClasses[variant],
          inset && insetSizes[insetSize],
          animationClasses,
          shadowClasses,
          roundedClasses,
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = SeparatorPrimitive.Root.displayName;

// Pre-built separator variants for common use cases
export const SectionSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  Omit<SeparatorProps, "variant" | "size" | "labelPosition">
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    variant="gradient"
    size="lg"
    className={cn("my-8", className)}
    {...props}
  />
));
SectionSeparator.displayName = "SectionSeparator";

export const InsetSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  Omit<SeparatorProps, "inset" | "insetSize">
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    inset
    insetSize="lg"
    className={cn("my-6", className)}
    {...props}
  />
));
InsetSeparator.displayName = "InsetSeparator";

export const Divider = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  Omit<SeparatorProps, "variant" | "size">
>(({ className, label, withIcon, ...props }, ref) => (
  <div className="relative">
    <Separator
      ref={ref}
      variant="default"
      size="md"
      className={cn("my-6", className)}
      {...props}
    />
    {(label || withIcon) && (
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 px-3">
        <div className="flex items-center gap-2">
          {withIcon}
          {label && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {label}
            </span>
          )}
        </div>
      </div>
    )}
  </div>
));
Divider.displayName = "Divider";

export const DashedSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  Omit<SeparatorProps, "variant">
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    variant="dashed"
    className={cn("my-4", className)}
    {...props}
  />
));
DashedSeparator.displayName = "DashedSeparator";

export const DottedSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  Omit<SeparatorProps, "variant">
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    variant="dotted"
    className={cn("my-4", className)}
    {...props}
  />
));
DottedSeparator.displayName = "DottedSeparator";

export const StrongSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  Omit<SeparatorProps, "variant" | "size">
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    variant="strong"
    size="lg"
    className={cn("my-6", className)}
    {...props}
  />
));
StrongSeparator.displayName = "StrongSeparator";

export const SubtleSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  Omit<SeparatorProps, "variant" | "size">
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    variant="subtle"
    size="sm"
    className={cn("my-2", className)}
    {...props}
  />
));
SubtleSeparator.displayName = "SubtleSeparator";

// Separator with text in the middle
interface TextSeparatorProps
  extends Omit<SeparatorProps, "label" | "withIcon"> {
  text: string;
  icon?: React.ReactNode;
  textClassName?: string;
}

export const TextSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  TextSeparatorProps
>(({ text, icon, textClassName, className, ...props }, ref) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    <Separator ref={ref} className="absolute inset-x-0" {...props} />
    <div className="relative bg-white dark:bg-gray-900 px-4">
      <div className="flex items-center gap-2">
        {icon}
        <span
          className={cn(
            "text-sm font-medium text-gray-500 dark:text-gray-400",
            textClassName
          )}
        >
          {text}
        </span>
      </div>
    </div>
  </div>
));
TextSeparator.displayName = "TextSeparator";

// Group separator for lists
interface GroupSeparatorProps extends SeparatorProps {
  count?: number;
  showCount?: boolean;
}

export const GroupSeparator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  GroupSeparatorProps
>(({ count, showCount = false, className, ...props }, ref) => (
  <div className={cn("flex items-center gap-3", className)}>
    <Separator ref={ref} className="flex-1" {...props} />
    {showCount && count !== undefined && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {count} items
        </span>
        <Separator orientation="vertical" className="h-4" />
      </div>
    )}
  </div>
));
GroupSeparator.displayName = "GroupSeparator";

export { Separator };
