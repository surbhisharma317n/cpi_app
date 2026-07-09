// Progress.tsx
import React from "react";

interface ProgressProps {
  value: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className }) => {
  const clamped = Math.min(Math.max(value, 0), 100);

  // Dynamic colors
  const getColor = () => {
    if (clamped < 40) return "bg-red-500";
    if (clamped < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className={`${getColor()} h-full transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
