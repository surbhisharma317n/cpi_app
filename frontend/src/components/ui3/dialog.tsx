"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react"; // ✅ Spinner + close icon
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string;
  description?: string;
  hideHeader?: boolean;
  disableClose?: boolean; // 🔒 disables overlay/Esc/close button
  isLoading?: boolean; // 🔄 show spinner beside title
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
      disableClose = false,
      isLoading = false,
      ...props
    },
    ref
  ) => {
    return (
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut"
          )}
        />

        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden",
            "border border-gray-200 bg-white shadow-xl sm:rounded-xl",
            "dark:border-gray-700 dark:bg-gray-900 dark:shadow-2xl",
            "data-[state=open]:animate-dialogIn data-[state=closed]:animate-dialogOut",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            className
          )}
          onInteractOutside={(e) => disableClose && e.preventDefault()} // 🚫 block outside click
          onEscapeKeyDown={(e) => disableClose && e.preventDefault()} // 🚫 block Esc key
          {...props}
        >
          {!hideHeader && (title || description) && (
            <DialogHeader
              title={title}
              description={description}
              hideClose={disableClose}
              isLoading={isLoading}
            />
          )}

          <div className="p-6 text-gray-800 dark:text-gray-200">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }
);
DialogContent.displayName = "DialogContent";

/** ✅ Header with spinner + optional close button */
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  hideClose?: boolean;
  isLoading?: boolean;
}

export const DialogHeader = ({
  className,
  title,
  description,
  children,
  hideClose = false,
  isLoading = false,
  ...props
}: DialogHeaderProps) => (
  <div
    className={cn(
      "flex items-start justify-between border-b border-gray-200 dark:border-gray-700 p-4",
      className
    )}
    {...props}
  >
    <div className="flex flex-col space-y-1.5">
      {title && (
        <div className="flex items-center gap-2">
          <DialogPrimitive.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </DialogPrimitive.Title>

          {/* 🔄 Show loader if in loading state */}
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          )}
        </div>
      )}

      {description && (
        <DialogPrimitive.Description className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </DialogPrimitive.Description>
      )}

      {children}
    </div>

    {!hideClose && (
      <DialogPrimitive.Close asChild>
        <button
          className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 rounded-md p-1 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </DialogPrimitive.Close>
    )}
  </div>
);
DialogHeader.displayName = "DialogHeader";

/** ✅ Footer */
export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-gray-200 pt-4 mt-2 px-6 pb-4",
      "dark:border-gray-700",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";
