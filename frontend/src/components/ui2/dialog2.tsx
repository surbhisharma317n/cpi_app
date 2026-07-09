"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../lib/utils";

// Dialog Root Components
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

// Dialog Types
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
export type DialogVariant =
  | "default"
  | "destructive"
  | "success"
  | "warning"
  | "info";

// Dialog Context for theming
interface DialogContextType {
  variant: DialogVariant;
  size: DialogSize;
  isLoading: boolean;
  disableClose: boolean;
}

const DialogContext = React.createContext<DialogContextType>({
  variant: "default",
  size: "md",
  isLoading: false,
  disableClose: false,
});

// Main Dialog Content Component
interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string;
  description?: string;
  hideHeader?: boolean;
  hideClose?: boolean;
  disableClose?: boolean;
  isLoading?: boolean;
  variant?: DialogVariant;
  size?: DialogSize;
  icon?: React.ReactNode;
  showOverlay?: boolean;
  overlayBlur?: boolean;
  closeOnOverlayClick?: boolean;
  preventScroll?: boolean;
  animationDuration?: number;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      title,
      description,
      hideHeader = false,
      hideClose = false,
      disableClose = false,
      isLoading = false,
      variant = "default",
      size = "md",
      icon,
      showOverlay = true,
      overlayBlur = true,
      closeOnOverlayClick = true,
      preventScroll = true,
      animationDuration = 200,
      ...props
    },
    ref
  ) => {
    const getSizeClasses = () => {
      const sizes: Record<DialogSize, string> = {
        sm: "max-w-sm",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-[95vw] max-h-[95vh]",
      };
      return sizes[size];
    };

    const getVariantClasses = () => {
      const variants: Record<DialogVariant, string> = {
        default: "border-gray-200 dark:border-gray-700",
        destructive: "border-red-200 dark:border-red-800",
        success: "border-green-200 dark:border-green-800",
        warning: "border-yellow-200 dark:border-yellow-800",
        info: "border-blue-200 dark:border-blue-800",
      };
      return variants[variant];
    };

    const getVariantIcon = () => {
      const icons: Record<DialogVariant, React.ReactNode> = {
        default: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        destructive: (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        ),
        success: (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        ),
        warning: (
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        ),
        info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      };
      return icon || icons[variant];
    };

    // Prevent body scroll when dialog is open
    React.useEffect(() => {
      if (preventScroll) {
        document.body.style.overflow = "hidden";
        return () => {
          document.body.style.overflow = "unset";
        };
      }
    }, [preventScroll]);

    return (
      <DialogContext.Provider
        value={{ variant, size, isLoading, disableClose }}
      >
        <DialogPrimitive.Portal>
          {showOverlay && (
            <DialogPrimitive.Overlay
              className={cn(
                "fixed inset-0 z-50 bg-black/50 backdrop-blur-xs",
                overlayBlur && "backdrop-blur-sm",
                "data-[state=open]:animate-overlayFadeIn data-[state=closed]:animate-overlayFadeOut"
              )}
              style={{
                animationDuration: `${animationDuration}ms`,
              }}
            />
          )}

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <DialogPrimitive.Content
              ref={ref}
              className={cn(
                getSizeClasses(),
                getVariantClasses(),
                "z-50 grid w-full overflow-hidden rounded-xl border bg-white shadow-2xl",
                "dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/50",
                "data-[state=open]:animate-dialogSlideIn data-[state=closed]:animate-dialogSlideOut",
                size === "full" && "h-[95vh]",
                className
              )}
              style={{
                animationDuration: `${animationDuration}ms`,
              }}
              onInteractOutside={(e) => {
                if (!closeOnOverlayClick || disableClose) {
                  e.preventDefault();
                }
              }}
              onEscapeKeyDown={(e) => {
                if (disableClose) {
                  e.preventDefault();
                }
              }}
              {...props}
            >
              {/* Decorative top border accent */}
              <div
                className={cn(
                  "h-1",
                  variant === "default" &&
                    "bg-gradient-to-r from-blue-500 to-blue-600",
                  variant === "destructive" &&
                    "bg-gradient-to-r from-red-500 to-red-600",
                  variant === "success" &&
                    "bg-gradient-to-r from-green-500 to-green-600",
                  variant === "warning" &&
                    "bg-gradient-to-r from-yellow-500 to-yellow-600",
                  variant === "info" &&
                    "bg-gradient-to-r from-blue-500 to-cyan-600"
                )}
              />

              {!hideHeader && (
                <DialogHeader
                  title={title}
                  description={description}
                  hideClose={hideClose || disableClose}
                  isLoading={isLoading}
                  icon={getVariantIcon()}
                />
              )}

              <div
                className={cn(
                  "p-6 text-gray-800 dark:text-gray-200",
                  size === "sm" && "p-4",
                  size === "lg" && "p-8",
                  size === "xl" && "p-10",
                  size === "full" && "h-full overflow-y-auto"
                )}
              >
                {children}
              </div>
            </DialogPrimitive.Content>
          </div>
        </DialogPrimitive.Portal>
      </DialogContext.Provider>
    );
  }
);
DialogContent.displayName = "DialogContent";

// Enhanced Dialog Header
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  hideClose?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  showIcon?: boolean;
}

export const DialogHeader = ({
  className,
  title,
  description,
  children,
  hideClose = false,
  isLoading = false,
  icon,
  showIcon = false,
  ...props
}: DialogHeaderProps) => {
  const { variant } = React.useContext(DialogContext);

  const getVariantTextColor = () => {
    const colors: Record<DialogVariant, string> = {
      default: "text-gray-900 dark:text-gray-100",
      destructive: "text-red-900 dark:text-red-100",
      success: "text-green-900 dark:text-green-100",
      warning: "text-yellow-900 dark:text-yellow-100",
      info: "text-blue-900 dark:text-blue-100",
    };
    return colors[variant];
  };

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-6 py-4",
        "border-b border-gray-100 dark:border-gray-800",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-start gap-3">
        {showIcon && icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}

        <div className="flex-1 space-y-1.5">
          {title && (
            <div className="flex items-center gap-2">
              <DialogPrimitive.Title
                className={cn(
                  "text-lg font-semibold leading-6",
                  getVariantTextColor()
                )}
              >
                {title}
              </DialogPrimitive.Title>

              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              )}
            </div>
          )}

          {description && (
            <DialogPrimitive.Description
              className={cn(
                "text-sm text-gray-600 dark:text-gray-400",
                variant === "destructive" && "text-red-700 dark:text-red-300",
                variant === "success" && "text-green-700 dark:text-green-300",
                variant === "warning" && "text-yellow-700 dark:text-yellow-300",
                variant === "info" && "text-blue-700 dark:text-blue-300"
              )}
            >
              {description}
            </DialogPrimitive.Description>
          )}

          {children}
        </div>
      </div>

      {!hideClose && (
        <DialogPrimitive.Close asChild>
          <button
            className={cn(
              "ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
              "text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "transition-all duration-200 hover:scale-110 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

// Enhanced Dialog Footer
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right" | "between";
  showDivider?: boolean;
  sticky?: boolean;
}

export const DialogFooter = ({
  className,
  align = "right",
  showDivider = true,
  sticky = false,
  children,
  ...props
}: DialogFooterProps) => {
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3",
        showDivider && "border-t border-gray-100 dark:border-gray-800",
        alignClasses[align],
        sticky && "sticky bottom-0 bg-white dark:bg-gray-900",
        "px-6 py-4 mt-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
DialogFooter.displayName = "DialogFooter";

// Dialog Body Component
export const DialogBody = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto", className)} {...props}>
    {children}
  </div>
);
DialogBody.displayName = "DialogBody";

// Dialog Actions Component
export const DialogActions = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);
DialogActions.displayName = "DialogActions";

// Pre-built Dialog Types Components
export const ConfirmationDialog = ({
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
  ...props
}: Omit<DialogContentProps, "children"> & {
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <DialogContent variant={variant} {...props}>
    <div className="space-y-4">
      {description && (
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      )}

      <DialogFooter>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            "px-4 py-2 text-sm font-medium text-white rounded-lg",
            variant === "destructive" && "bg-red-600 hover:bg-red-700",
            variant === "success" && "bg-green-600 hover:bg-green-700",
            variant === "warning" && "bg-yellow-600 hover:bg-yellow-700",
            variant === "info" && "bg-blue-600 hover:bg-blue-700",
            variant === "default" && "bg-blue-600 hover:bg-blue-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            confirmText
          )}
        </button>
      </DialogFooter>
    </div>
  </DialogContent>
);

export const LoadingDialog = ({
  title = "Processing",
  description = "Please wait while we process your request...",
  ...props
}: Omit<DialogContentProps, "children" | "isLoading">) => (
  <DialogContent
    title={title}
    description={description}
    isLoading
    disableClose
    {...props}
  >
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400" />
    </div>
  </DialogContent>
);

export const SuccessDialog = ({
  title = "Success!",
  description,
  buttonText = "Continue",
  onClose,
  ...props
}: Omit<DialogContentProps, "children"> & {
  buttonText?: string;
  onClose: () => void;
}) => (
  <DialogContent
    variant="success"
    title={title}
    description={description}
    {...props}
  >
    <div className="text-center space-y-6">
      <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
      <DialogFooter>
        <button
          onClick={onClose}
          className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          {buttonText}
        </button>
      </DialogFooter>
    </div>
  </DialogContent>
);

// CSS Animations (Add to your global CSS)
const styles = `
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes overlayFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes dialogSlideOut {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
}
`;

// Export a style component for animations
export const DialogStyles = () => (
  <style>
    {styles}
  </style>
);

// Helper Hook for Dialog State Management
export function useDialog() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}
