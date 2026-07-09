"use client";

import * as React from "react";
import { cn } from "../../lib/utils"; // optional helper for merging classNames

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "full";
  isLoading?: boolean;
}

/**
 * 🧩 Reusable Button Component
 * - Responsive padding/sizes
 * - Multiple variants
 * - Optional loading state
 * - ForwardRef for compatibility with Radix/Dialog
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className = "",
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    // 🔹 Variants
    const variantClasses: Record<string, string> = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300",
      secondary:
        "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-200",
      outline:
        "bg-transparent border border-gray-400 text-gray-800 hover:bg-gray-100 focus:ring-gray-200",
      ghost:
        "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-100",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300",
    };

    // 🔹 Sizes (with responsive tweaks)
    const sizeClasses: Record<string, string> = {
      sm: "px-3 py-1.5 text-xs sm:text-sm",
      md: "px-4 py-2 text-sm sm:text-base",
      lg: "px-6 py-3 text-base sm:text-lg",
      full: "w-full px-4 py-2 text-base sm:text-lg",
    };

    // 🔹 Loading spinner
    const spinner = (
      <svg
        className="animate-spin h-4 w-4 mr-2 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
    );

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          `inline-flex items-center justify-center rounded-xl font-medium transition-all
           duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
           disabled:opacity-50 disabled:pointer-events-none
           ${variantClasses[variant]} ${sizeClasses[size]} ${className}`
        )}
        {...props}
      >
        {isLoading ? (
          <>
            {spinner}
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
