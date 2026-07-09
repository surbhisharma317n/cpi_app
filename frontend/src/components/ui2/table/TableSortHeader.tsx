// components/ui2/table/TableSortHeader.tsx
import React from "react";
import { cn } from "../../../lib/utils";
import type { TableColumn, TableSortState } from "./types";

interface TableSortHeaderProps {
  column: TableColumn;
  sortable: boolean;
  sortState?: TableSortState;
  onSort?: (columnKey: string) => void;
  className?: string;
}

export const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  column,
  sortable,
  sortState,
  onSort,
  className,
}) => {
  const isSorted = sortState?.column === column.key;

  const handleClick = () => {
    if (sortable && onSort) {
      onSort(column.key);
    }
  };

  const getSortIcon = () => {
    if (!isSorted) return "↕";
    if (sortState?.direction === "asc") return "↑";
    if (sortState?.direction === "desc") return "↓";
    return "↕";
  };

  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-medium text-gray-700",
        sortable && "cursor-pointer select-none hover:bg-gray-100",
        column.align === "center" && "text-center",
        column.align === "right" && "text-right",
        className
      )}
      onClick={handleClick}
      role="columnheader"
      scope="col"
      aria-sort={
        isSorted
          ? sortState.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      style={column.width ? { width: column.width } : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          column.align === "center" && "justify-center",
          column.align === "right" && "justify-end"
        )}
      >
        <span>{column.header}</span>
        {sortable && (
          <span className="text-xs text-gray-400" aria-hidden="true">
            {getSortIcon()}
          </span>
        )}
      </div>
    </th>
  );
};
