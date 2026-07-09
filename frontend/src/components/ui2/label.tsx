// components/ui2/label.tsx
import * as React from "react";
import { cn } from "../../lib/utils";
import {  IconTooltip } from "./tooltip";
import { FiAlertCircle, FiInfo, FiCheckCircle } from "react-icons/fi";

// Types
export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  warning?: boolean;
  info?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "bold" | "light" | "ghost";
  position?: "above" | "inline" | "floating";
  className?: string;
  tooltip?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  description?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "error" | "warning" | "info";
  as?: "label" | "div" | "span";
  isFocused?: boolean;
  hideRequiredIndicator?: boolean;
}

// Main Label Component
export function Label({
  children,
  htmlFor,
  required = false,
  optional = false,
  disabled = false,
  error = false,
  success = false,
  warning = false,
  info = false,
  size = "md",
  variant = "default",
  position = "above",
  className,
  tooltip,
  tooltipSide = "right",
  icon,
  iconPosition = "left",
  description,
  badge,
  badgeVariant = "default",
  as: Component = "label",
  isFocused = false,
  hideRequiredIndicator = false,
  ...props
}: LabelProps) {
  // Size classes
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  // Variant classes
  const variantClasses = {
    default: "text-gray-900",
    bold: "text-gray-900 font-semibold",
    light: "text-gray-600",
    ghost: "text-gray-500",
  };

  // State classes
  const stateClasses = {
    error: "text-red-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
    disabled: "text-gray-400 cursor-not-allowed",
    focused: "ring-2 ring-blue-500/20",
  };

  // Badge variants
  const badgeVariants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  // Position classes
  const positionClasses = {
    above: "mb-1.5 block",
    inline: "inline-flex items-center mr-3",
    floating: "absolute -top-2 left-3 px-1 bg-white text-xs z-10",
  };

  // Determine which state class to apply
  const getStateClass = () => {
    if (disabled) return stateClasses.disabled;
    if (error) return stateClasses.error;
    if (success) return stateClasses.success;
    if (warning) return stateClasses.warning;
    if (info) return stateClasses.info;
    if (isFocused) return stateClasses.focused;
    return "";
  };

  // Get icon based on state
  const getStateIcon = () => {
    if (error) return <FiAlertCircle className="h-4 w-4" />;
    if (success) return <FiCheckCircle className="h-4 w-4" />;
    if (warning) return <FiAlertCircle className="h-4 w-4" />;
    if (info) return <FiInfo className="h-4 w-4" />;
    return icon;
  };

  // Determine if we should show state icon
  const showStateIcon = error || success || warning || info;

  const labelContent = (
    <div className="flex items-center gap-2">
      {/* Left Icon */}
      {iconPosition === "left" && (showStateIcon || icon) && (
        <span className="shrink-0">{getStateIcon()}</span>
      )}

      {/* Label Text */}
      <span
        className={cn(
          "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          sizeClasses[size],
          variantClasses[variant],
          getStateClass()
        )}
      >
        {children}
      </span>

      {/* Required/Optional Indicators */}
      {required && !hideRequiredIndicator && (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      )}
      {optional && (
        <span className="ml-1 text-xs text-gray-500">(optional)</span>
      )}

      {/* Badge */}
      {badge && (
        <span
          className={cn(
            "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
            badgeVariants[badgeVariant]
          )}
        >
          {badge}
        </span>
      )}

      {/* Tooltip Icon */}
      {tooltip && (
        <IconTooltip
          icon={<FiInfo className="h-3.5 w-3.5 text-gray-400" />}
          content={tooltip}
          side={tooltipSide}
          className="shrink-0"
        />
      )}

      {/* Right Icon */}
      {iconPosition === "right" && (showStateIcon || icon) && (
        <span className="shrink-0 ml-auto">{getStateIcon()}</span>
      )}
    </div>
  );

  // Description
  const descriptionContent = description && (
    <p
      className={cn(
        "mt-1 text-sm",
        error
          ? "text-red-500"
          : success
            ? "text-green-500"
            : warning
              ? "text-yellow-500"
              : info
                ? "text-blue-500"
                : "text-gray-500"
      )}
    >
      {description}
    </p>
  );

  // Render based on position
  if (position === "floating") {
    return (
      <div className="relative">
        <Component
          {...(Component === "label" && { htmlFor })}
          className={cn(
            positionClasses[position],
            "rounded",
            getStateClass(),
            className
          )}
          {...(props as any)}
        >
          {labelContent}
        </Component>
        {descriptionContent}
      </div>
    );
  }

  return (
    <div className={cn(position === "above" ? "block" : "inline-flex")}>
      <Component
        {...(Component === "label" && { htmlFor })}
        className={cn(
          positionClasses[position],
          "cursor-pointer",
          disabled && "cursor-not-allowed",
          getStateClass(),
          className
        )}
        {...(props as any)}
      >
        {labelContent}
      </Component>
      {descriptionContent}
    </div>
  );
}

// Specialized Label Components

// Form Field Label
interface FormLabelProps extends Omit<LabelProps, "children"> {
  label: string;
  fieldId: string;
  helperText?: string;
  errorText?: string;
}

function FormLabel({
  label,
  fieldId,
  helperText,
  errorText,
  error,
  required,
  tooltip,
  ...props
}: FormLabelProps) {
  const hasError = Boolean(error || errorText);

  return (
    <div className="space-y-1">
      <Label
        htmlFor={fieldId}
        required={required}
        error={hasError}
        tooltip={tooltip}
        {...props}
      >
        {label}
      </Label>

      {helperText && !hasError && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}

      {errorText && <p className="text-sm text-red-500">{errorText}</p>}
    </div>
  );
}

// Label with Counter
interface CounterLabelProps extends Omit<LabelProps, "children"> {
  label: string;
  current: number;
  max: number;
  showPercentage?: boolean;
}

function CounterLabel({
  label,
  current,
  max,
  showPercentage = false,
  ...props
}: CounterLabelProps) {
  const percentage = (current / max) * 100;
  const isWarning = percentage >= 80 && percentage < 100;
  const isError = percentage >= 100;

  return (
    <div className="flex items-center justify-between">
      <Label {...props}>{label}</Label>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-sm font-medium",
            isError
              ? "text-red-600"
              : isWarning
                ? "text-yellow-600"
                : "text-gray-600"
          )}
        >
          {current}/{max}
        </span>
        {showPercentage && (
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              isError
                ? "bg-red-100 text-red-700"
                : isWarning
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
            )}
          >
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Label Group (for radio/checkbox groups)
interface LabelGroupProps {
  children: React.ReactNode;
  label?: string;
  description?: string;
  error?: boolean;
  required?: boolean;
  className?: string;
}

function LabelGroup({
  children,
  label,
  description,
  error,
  required,
  className,
}: LabelGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="space-y-1">
          <Label required={required} error={error} size="sm" variant="bold">
            {label}
          </Label>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Switch/Toggle Label
interface SwitchLabelProps extends Omit<LabelProps, "children" | "onChange"> {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  description?: string;
}

function SwitchLabel({
  label,
  checked,
  onChange,
  description,
  disabled,
  ...props
}: SwitchLabelProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          checked ? "bg-blue-600" : "bg-gray-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Label
            as="span"
            onClick={() => !disabled && onChange?.(!checked)}
            className={cn(
              "cursor-pointer select-none",
              disabled && "cursor-not-allowed"
            )}
            disabled={disabled}
            {...props}
          >
            {label}
          </Label>
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

// Label with Status Dot
interface StatusLabelProps extends Omit<LabelProps, "children"> {
  label: string;
  status: "online" | "offline" | "away" | "busy";
  showStatus?: boolean;
}

function StatusLabel({
  label,
  status,
  showStatus = true,
  ...props
}: StatusLabelProps) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500",
    busy: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-2">
      {showStatus && (
        <span
          className={cn("h-2 w-2 rounded-full", statusColors[status])}
          aria-label={`Status: ${status}`}
        />
      )}
      <Label {...props}>{label}</Label>
    </div>
  );
}

// Label with Loading State
interface LoadingLabelProps extends Omit<LabelProps, "children"> {
  label: string;
  loading?: boolean;
  loadingText?: string;
}

function LoadingLabel({
  label,
  loading = false,
  loadingText = "Loading...",
  ...props
}: LoadingLabelProps) {
  return (
    <div className="flex items-center gap-2">
      <Label {...props}>{loading ? loadingText : label}</Label>
      {loading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      )}
    </div>
  );
}

// Label with Action Button
interface ActionLabelProps extends Omit<LabelProps, "children"> {
  label: string;
  actionText: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

function ActionLabel({
  label,
  actionText,
  onAction,
  actionIcon,
  ...props
}: ActionLabelProps) {
  return (
    <div className="flex items-center justify-between">
      <Label {...props}>{label}</Label>
      <button
        type="button"
        onClick={onAction}
        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
      >
        {actionIcon && <span>{actionIcon}</span>}
        {actionText}
      </button>
    </div>
  );
}

// Export all components
export {
  Label as default,
  FormLabel,
  CounterLabel,
  LabelGroup,
  SwitchLabel,
  StatusLabel,
  LoadingLabel,
  ActionLabel,
};
