import React from "react";
import clsx from "clsx";

interface ExportButtonProps {
  onClick: () => void;
  label?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onClick,
  label = "Export",
  loading = false,
  disabled = false,
  className = "",
}) => {
  const isDisabled = loading || disabled;

  return (
    <button
  type="button"
  onClick={!isDisabled && !loading ? onClick : undefined}
  disabled={isDisabled || loading}
  aria-busy={loading}
  aria-disabled={isDisabled || loading}
  className={clsx(
    "h-8 px-4 rounded-md",
    "text-sm font-semibold tracking-wide",
    "inline-flex items-center justify-center gap-2",
    "bg-blue-900 text-white",
    "hover:bg-blue-800 active:bg-blue-950",
    "shadow-sm hover:shadow-md",
    "transition-all duration-200 ease-in-out",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    className
  )}
>
  {loading && (
    <span
      className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    />
  )}
  <span className="whitespace-nowrap">{label}</span>
</button>

  );
};

export default ExportButton;
