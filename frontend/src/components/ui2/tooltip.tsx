// components/ui2/tooltip.tsx
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

// Types
export interface TooltipProps extends TooltipPrimitive.TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  arrowPadding?: number;
  sticky?: "partial" | "always";
  hideWhenDetached?: boolean;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
  arrowClassName?: string;
  maxWidth?: string | number;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
}

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  arrow?: boolean;
  arrowClassName?: string;
  maxWidth?: string | number;
}

// TooltipProvider Component
export function TooltipProvider({
  children,
  delayDuration = 300,
  skipDelayDuration = 300,
  disableHoverableContent = false,
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

// Tooltip Component
export function Tooltip({
  children,
  content,
  delayDuration = 300,
  disableHoverableContent = false,
  side = "top",
  align = "center",
  sideOffset = 4,
  alignOffset = 0,
  collisionPadding = 8,
  arrowPadding = 8,
  sticky = "partial",
  hideWhenDetached = false,
  contentClassName,
  arrow = true,
  arrowClassName,
  maxWidth = 250,
  disabled = false,
  open,
  onOpenChange,
  ...props
}: TooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  // ✅ Ensure exactly ONE valid element
  const trigger =
    React.isValidElement(children) ? (
      children
    ) : (
      <span className="inline-flex">{children}</span>
    );

  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    >
      {/* SAFE asChild usage */}
      <TooltipPrimitive.Trigger asChild>
        {trigger}
      </TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={cn(
            "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm",
            "bg-gray-900 text-gray-50 shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2",
            "data-[side=top]:slide-in-from-bottom-2",
            contentClassName
          )}
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          arrowPadding={arrow ? arrowPadding : 0}
          sticky={sticky}
          hideWhenDetached={hideWhenDetached}
          style={{ maxWidth }}
        >
          {content}
          {arrow && (
            <TooltipPrimitive.Arrow
              className={cn("fill-gray-900", arrowClassName)}
              width={11}
              height={5}
            />
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// TooltipTrigger Component
export const TooltipTrigger = TooltipPrimitive.Trigger;

// TooltipContent Component
export function TooltipContent({
  className,
  children,
  side = "top",
  align = "center",
  sideOffset = 4,
  arrow = true,
  arrowClassName,
  maxWidth = 250,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm",
          "bg-gray-900 text-gray-50 shadow-lg",
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        side={side}
        align={align}
        sideOffset={sideOffset}
        style={{ maxWidth }}
        {...props}
      >
        {children}
        {arrow && (
          <TooltipPrimitive.Arrow
            className={cn("fill-gray-900", arrowClassName)}
            width={11}
            height={5}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

// Advanced Tooltip Components

// Tooltip with Icon
interface IconTooltipProps extends Omit<TooltipProps, "children"> {
  icon: React.ReactNode;
  iconClassName?: string;
}

export function IconTooltip({
  icon,
  iconClassName,
  content,
  ...props
}: IconTooltipProps) {
  return (
    <Tooltip content={content} {...props}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center",
          "text-gray-500 hover:text-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          iconClassName
        )}
        aria-label="More information"
      >
        {icon}
      </button>
    </Tooltip>
  );
}

// Tooltip with Custom Trigger
interface CustomTooltipProps extends TooltipProps {
  trigger: React.ReactNode;
}

export function CustomTooltip({
  trigger,
  content,
  ...props
}: CustomTooltipProps) {
  return (
    <Tooltip content={content} {...props}>
      <div className="inline-flex">{trigger}</div>
    </Tooltip>
  );
}

// Multi-line Tooltip
interface MultilineTooltipProps extends TooltipProps {
  title?: string;
  description: string;
}

export function MultilineTooltip({
  children,
  title,
  description,
  className,
  contentClassName,
  ...props
}: MultilineTooltipProps) {
  const { content: _content, ...restProps } = props;
  return (
    <Tooltip
      content={
        <div className="space-y-1">
          {title && <div className="font-semibold">{title}</div>}
          <div className="text-gray-300">{description}</div>
        </div>
      }
      contentClassName={cn("p-3", contentClassName)}
      maxWidth={300}
      {...restProps}
    >
      {children}
    </Tooltip>
  );
}

// Status Tooltip
interface StatusTooltipProps
  extends Omit<TooltipProps, "children" | "content"> {
  status: "success" | "error" | "warning" | "info";
  message: string;
  icon?: React.ReactNode;
}

export function StatusTooltip({
  status,
  message,
  icon,
  ...props
}: StatusTooltipProps) {
  const statusConfig = {
    success: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
      icon: icon || "✅",
    },
    error: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-200",
      icon: icon || "❌",
    },
    warning: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-200",
      icon: icon || "⚠️",
    },
    info: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
      icon: icon || "ℹ️",
    },
  }[status];

  return (
    <Tooltip
      content={
        <div className={cn("flex items-center gap-2", statusConfig.text)}>
          <span>{statusConfig.icon}</span>
          <span>{message}</span>
        </div>
      }
      contentClassName={cn(statusConfig.bg, "border", statusConfig.border)}
      {...props}
    >
      <div
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full",
          statusConfig.bg,
          statusConfig.text
        )}
      >
        {statusConfig.icon}
      </div>
    </Tooltip>
  );
}

// Delayed Tooltip (for performance)
interface DelayedTooltipProps extends TooltipProps {
  delay?: number;
}

export function DelayedTooltip({
  delay = 1000,
  delayDuration,
  ...props
}: DelayedTooltipProps) {
  const [isDelayed, setIsDelayed] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayed(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (isDelayed) {
    return <>{props.children}</>;
  }

  return <Tooltip delayDuration={delayDuration} {...props} />;
}

// Tooltip Group (for multiple related tooltips)
interface TooltipGroupProps {
  children: React.ReactNode;
  gap?: number;
}

export function TooltipGroup({ children, gap = 8 }: TooltipGroupProps) {
  return (
    <div className="flex items-center" style={{ gap }}>
      {children}
    </div>
  );
}

// Controlled Tooltip (for complex interactions)
interface ControlledTooltipProps
  extends Omit<TooltipProps, "open" | "onOpenChange"> {
  initialOpen?: boolean;
}

export function ControlledTooltip({
  children,
  content,
  initialOpen = false,
  ...props
}: ControlledTooltipProps) {
  const [open, setOpen] = React.useState(initialOpen);

  return (
    <Tooltip open={open} onOpenChange={setOpen} content={content} {...props}>
      {children}
    </Tooltip>
  );
}

// Export all components
export { TooltipPrimitive };
