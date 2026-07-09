// components/ui2/table/TableLoading.tsx
import React from "react";
import { cn } from "./utils";

interface TableLoadingProps {
  columns: number;
  rows?: number;
  size?: "sm" | "md" | "lg";
}

export const TableLoading: React.FC<TableLoadingProps> = ({
  columns,
  rows = 5,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-3",
    md: "h-4",
    lg: "h-5",
  };

  return (
    <div className="w-full overflow-auto border border-gray-200 rounded-lg">
      <table className="w-full min-w-full">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 bg-gray-50">
                <div
                  className={cn(
                    "bg-gray-200 rounded animate-pulse",
                    sizeClasses[size]
                  )}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-t border-gray-100">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div
                    className={cn(
                      "bg-gray-100 rounded animate-pulse",
                      sizeClasses[size]
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
