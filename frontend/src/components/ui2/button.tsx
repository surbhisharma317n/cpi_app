"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type ButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "full"
  | "default"
  | "icon";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";



export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className,
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    // ✅ STRICT VARIANT MAP
   const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300",

  secondary:
    "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-200",

  outline:
    "border border-gray-400 text-gray-800 hover:bg-gray-100",

  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100",

  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300",

  link:
    "bg-transparent text-blue-600 underline-offset-4 hover:underline",
};
    // ✅ STRICT SIZE MAP
    const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs sm:text-sm",
  md: "px-4 py-2 text-sm sm:text-base",
  lg: "px-6 py-3 text-base sm:text-lg",
  xl: "px-7 py-3.5 text-lg",
  "2xl": "px-8 py-4 text-xl",
  "3xl": "px-10 py-5 text-2xl",
  "4xl": "px-12 py-6 text-3xl",
  "5xl": "px-14 py-7 text-4xl",
  "6xl": "px-16 py-8 text-5xl",
  full: "w-full px-4 py-2 text-base sm:text-lg",
  default: "px-4 py-2 text-sm",

  // ✅ ADD THIS
  icon: "h-10 w-10 p-0 flex items-center justify-center",
};

    const spinner = (
      <svg
        className="animate-spin h-4 w-4 mr-2 text-current"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    );

    return (
     <button
  ref={ref}
  disabled={isLoading || disabled}
  className={cn(
    "inline-flex items-center justify-center rounded-xl font-medium",
    "transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    variantClasses[variant as ButtonVariant],
    sizeClasses[size as ButtonSize],
    className
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