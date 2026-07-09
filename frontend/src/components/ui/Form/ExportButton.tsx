import React from "react";
import { Loader2 } from "lucide-react"; // optional loading icon
type ExportButtonProps = {
  onClick: () => void;
  title?: string; // Button title
  loading?: boolean; // Loading state
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; // Optional icon component
  disabled?: boolean; // Disabled state
  className?: string; // Additional CSS classes
};


const ExportButton = ({
  title = "Export",
  onClick,
  loading = false,
  icon: Icon, // pass icon component (optional)
  disabled = false,
  className = "",
}:ExportButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        flex items-center justify-center gap-2
        px-4 py-2 rounded-lg font-medium
        bg-blue-600 text-white shadow-sm
        hover:bg-blue-700 active:bg-blue-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4" />
      )}
      <span>{loading ? "Processing..." : title}</span>
    </button>
  );
};

export default ExportButton;
