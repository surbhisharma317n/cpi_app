import React from "react";
import toast from "react-hot-toast";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";

type ToastVariant = "default" | "destructive" | "warning" | "success";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  icon?: React.ReactNode;
  duration?: number;
}

/**
 * useToast — a unified Shadcn-style toast API using react-hot-toast under the hood
 */
export const useToast = () => {
  const showToast = ({
    title,
    description,
    variant = "default",
    icon,
    duration = 4000,
  }: ToastOptions) => {
    const variantColors = {
      default: "border-blue-500 text-gray-900",
      success: "border-green-500 text-green-700",
      warning: "border-amber-500 text-amber-700",
      destructive: "border-red-500 text-red-700",
    };

    // Pick color based on variant
    const colorClass = variantColors[variant] || variantColors.default;

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-sm w-full bg-white shadow-lg rounded-xl pointer-events-auto ring-1 ring-gray-200 p-4 border-l-4 ${colorClass}`}
        >
          <div className="flex items-start space-x-3">
            {/* Icon */}
            {icon ? (
              <div className="text-xl mt-0.5">{icon}</div>
            ) : variant === "success" ? (
              <FiCheckCircle className="text-green-600 text-xl mt-0.5" />
            ) : variant === "destructive" ? (
              <FiXCircle className="text-red-600 text-xl mt-0.5" />
            ) : variant === "warning" ? (
              <FiAlertTriangle className="text-amber-500 text-xl mt-0.5" />
            ) : (
              <FiInfo className="text-blue-500 text-xl mt-0.5" />
            )}

            {/* Text */}
            <div className="flex-1">
              {title && <p className="font-semibold text-gray-900">{title}</p>}
              {description && (
                <p className="text-gray-700 text-sm mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
      ),
      { duration }
    );
  };

  return { toast: showToast };
};
