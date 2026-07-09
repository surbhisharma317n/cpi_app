"use client";


import { cn } from "../../../lib/utils";

interface ProgressProps {
  value?: number; // 0–100
  className?: string;
}

export const Progress = ({ value = 0, className }: ProgressProps) => {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "w-full h-2 bg-gray-200 rounded-full overflow-hidden",
        className
      )}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
};