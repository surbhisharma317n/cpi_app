// components/ui2/table/DataTable.tsx
import React, { useState, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
import { cn } from "./utils";
import { TableLoading } from "./TableLoading";
import { TableEmpty } from "./TableEmpty";
import type { TableVariant, TableSize } from "./types";

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  loading?: boolean;
  emptyState?: React.ReactNode;

  // Sorting
  enableSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;

  // Filtering
  enableColumnFilters?: boolean;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;

  // Pagination
  enablePagination?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  pageCount?: number;

  // Selection
  enableRowSelection?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;

  // UI
  variant?: TableVariant;
  size?: TableSize;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: string;

  // Callbacks
  onRowClick?: (row: TData, index: number) => void;
  getRowClassName?: (row: TData, index: number) => string;
}

export function DataTable<TData>({
  data,
  columns,
  loading = false,
  emptyState,
  // enableSorting = true,
  sorting,
  onSortingChange,
  // enableColumnFilters = false,
  columnFilters,
  onColumnFiltersChange,
  enablePagination = false,
  pagination,
  onPaginationChange,
  pageCount,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  variant = "default",
  size = "md",
  className,
  tableClassName,
  headerClassName,
  rowClassName,
  onRowClick,
  getRowClassName,
}: DataTableProps<TData>) {
  // Internal state if not controlled
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] =
    useState<ColumnFiltersState>([]);
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    {
      pageIndex: 0,
      pageSize: 10,
    }
  );
  const [internalRowSelection, setInternalRowSelection] = useState<
    Record<string, boolean>
  >({});

  const handleSortingChange = useCallback(
    (updater: any) => {
      const newSorting =
        typeof updater === "function"
          ? updater(sorting ?? internalSorting)
          : updater;
      if (onSortingChange) {
        onSortingChange(newSorting);
      } else {
        setInternalSorting(newSorting);
      }
    },
    [sorting, internalSorting, onSortingChange]
  );

  const handleColumnFiltersChange = useCallback(
    (updater: any) => {
      const newFilters =
        typeof updater === "function"
          ? updater(columnFilters ?? internalColumnFilters)
          : updater;
      if (onColumnFiltersChange) {
        onColumnFiltersChange(newFilters);
      } else {
        setInternalColumnFilters(newFilters);
      }
    },
    [columnFilters, internalColumnFilters, onColumnFiltersChange]
  );

  const handlePaginationChange = useCallback(
    (updater: any) => {
      const newPagination =
        typeof updater === "function"
          ? updater(pagination ?? internalPagination)
          : updater;
      if (onPaginationChange) {
        onPaginationChange(newPagination);
      } else {
        setInternalPagination(newPagination);
      }
    },
    [pagination, internalPagination, onPaginationChange]
  );

  const handleRowSelectionChange = useCallback(
    (updater: any) => {
      const newSelection =
        typeof updater === "function"
          ? updater(rowSelection ?? internalRowSelection)
          : updater;
      if (onRowSelectionChange) {
        onRowSelectionChange(newSelection);
      } else {
        setInternalRowSelection(newSelection);
      }
    },
    [rowSelection, internalRowSelection, onRowSelectionChange]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sorting ?? internalSorting,
      columnFilters: columnFilters ?? internalColumnFilters,
      pagination: enablePagination
        ? (pagination ?? internalPagination)
        : undefined,
      rowSelection: enableRowSelection
        ? (rowSelection ?? internalRowSelection)
        : undefined,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    manualPagination: enablePagination && !!pageCount,
    pageCount: pageCount,
    enableRowSelection,
    enableMultiRowSelection: enableRowSelection,
    autoResetPageIndex: false,
  });

  const variantClasses: Record<TableVariant, string> = {
    default: "border border-gray-200 rounded-lg",
    bordered: "border border-gray-300 rounded-lg",
    striped:
      "border border-gray-200 rounded-lg [&_tbody_tr:nth-child(even)]:bg-gray-50",
    hover: "border border-gray-200 rounded-lg [&_tbody_tr:hover]:bg-gray-50",
  };

  const sizeClasses: Record<TableSize, string> = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (loading) {
    return <TableLoading columns={columns.length} size={size} />;
  }

  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  if (!data.length) {
    return <TableEmpty />;
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div className={cn("overflow-auto", variantClasses[variant])}>
        <table
          className={cn(
            "w-full min-w-full bg-white",
            sizeClasses[size],
            tableClassName
          )}
        >
          <thead className={cn("bg-gray-50", headerClassName)}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap",
                      header.column.getCanSort() &&
                        "cursor-pointer select-none hover:bg-gray-100",
                      (header.column.columnDef.meta as any)?.className
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      width:
                        header.getSize() !== 150 ? header.getSize() : undefined,
                      minWidth: header.getSize(),
                    }}
                    colSpan={header.colSpan}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          (header.column.columnDef.meta as any)?.align ===
                            "center" && "justify-center",
                          (header.column.columnDef.meta as any)?.align ===
                            "right" && "justify-end"
                        )}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="text-xs text-gray-400">
                            {{
                              asc: "↑",
                              desc: "↓",
                            }[header.column.getIsSorted() as string] ?? "↕"}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-gray-50",
                  rowClassName,
                  getRowClassName?.(row.original, index)
                )}
                onClick={() => onRowClick?.(row.original, index)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-3 whitespace-nowrap",
                      (cell.column.columnDef.meta as any)?.align === "center" &&
                        "text-center",
                      (cell.column.columnDef.meta as any)?.align === "right" &&
                        "text-right",
                      (cell.column.columnDef.meta as any)?.cellClassName
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {enablePagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "px-3 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50",
                !table.getCanPreviousPage() && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              className={cn(
                "px-3 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50",
                !table.getCanNextPage() && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
