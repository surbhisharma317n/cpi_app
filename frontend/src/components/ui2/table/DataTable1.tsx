import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";

import { useState, useEffect } from "react";

export interface TableQuery {
  pageIndex: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  loading?: boolean;

  // Server mode
  manual?: boolean;
  totalCount?: number;

  // Feature toggles
  selectable?: boolean;
  enableGlobalFilter?: boolean;

  pageSizeOptions?: number[];

  // Events
  onQueryChange?: (query: TableQuery) => void;
  onSelectionChange?: (rows: TData[]) => void;
}

export function DataTable<TData>({
  data,
  columns,
  loading = false,
  manual = false,
  totalCount = 0,
  selectable = false,
  enableGlobalFilter = true,
  pageSizeOptions = [10, 20, 50],
  onQueryChange,
  onSelectionChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] =
    useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSizeOptions[0],
  });

  // 🔥 Debounced Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      emitQuery();
    }, 500);

    return () => clearTimeout(timeout);
  }, [globalFilter]);

  // Emit query when pagination or sorting changes
  useEffect(() => {
    emitQuery();
  }, [pagination, sorting]);

  const emitQuery = () => {
    if (!manual || !onQueryChange) return;

    const sort = sorting[0];

    onQueryChange({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      search: globalFilter,
      sortBy: sort?.id,
      sortOrder: sort?.desc ? "desc" : "asc",
    });
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    manualPagination: manual,
    pageCount: manual
      ? Math.ceil(totalCount / pagination.pageSize)
      : undefined,

    enableRowSelection: selectable,

    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater(rowSelection)
          : updater;

      setRowSelection(newState);

      if (onSelectionChange) {
        const selected = Object.keys(newState)
          .filter((k) => newState[k])
          .map((k) => table.getRowModel().rowsById[k]?.original)
          .filter(Boolean);

        onSelectionChange(selected as TData[]);
      }
    },
    onPaginationChange: setPagination,

    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      {enableGlobalFilter && (
        <input
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="border px-3 py-2 rounded-md w-72"
        />
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="p-3 text-left cursor-pointer"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <span>
          Page {pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>

        <div className="flex gap-2">
          <select
            value={pagination.pageSize}
            onChange={(e) =>
              table.setPageSize(Number(e.target.value))
            }
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </button>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}