import { useEffect, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Search, Edit, Trash2 } from "lucide-react";

import { exportToCSV, exportToExcel, exportToPDF } from "./exportsData";
import ExportButtons from "./ExportButtons";
import { Pagination } from "./pagination";
import EditModal from "../model/EditModal";

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  title: string;
  action?: { edit?: boolean; delete?: boolean };
  file_name?: string;
  serverPagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    setCurrentPage: (p: number) => void;
    setPageSize: (s: number) => void;
    fetchData: () => void;
  };
  fetchAllData?: (params: { search: string; columns: string[] }) => Promise<any[]>;
};

export function DynamicDataTable<T extends object>({
  data,
  columns,
  title,
  action = { edit: false, delete: false },
  file_name,
  serverPagination,
  fetchAllData, // 🔥 NEW PRO P
}: Props<T>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Check horizontal overflow for sticky columns
  useEffect(() => {
    const checkOverflow = () => {
      const el = containerRef.current;
      if (el) setIsOverflowing(el.scrollWidth > el.clientWidth);
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [data, columns]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 13 } },
  });

  // Export helpers
  const getExportData = () =>
    table.getFilteredRowModel().rows.map((row) =>
      row.getVisibleCells().reduce(
        (acc, cell) => {
          acc[cell.column.id] = cell.getValue();
          return acc;
        },
        {} as Record<string, any>
      )
    );

  const getExportColumns = () => table.getVisibleFlatColumns().map((c) => c.id);

const handleExport = async (format: "csv" | "excel" | "pdf") => {
  const cols = getExportColumns();
  const name = file_name || "data_export";

  let rows: any[] = [];

  try {
    // 🔥 FULL DATA (if provided from parent)
    if (fetchAllData) {
      rows = await fetchAllData({
        search: globalFilter,
        columns: cols,
      });
    } else {
      // ⚠️ fallback → current filtered data
      rows = getExportData();
    }

    // 🔥 Ensure column consistency
    const formattedRows = rows.map((row) => {
      const newRow: any = {};
      cols.forEach((col) => {
        newRow[col] = row[col];
      });
      return newRow;
    });

    switch (format) {
      case "csv":
        exportToCSV(formattedRows, cols, name);
        break;
      case "excel":
        exportToExcel(formattedRows, cols, name);
        break;
      case "pdf":
        exportToPDF(formattedRows, cols, name);
        break;
    }
  } catch (err) {
    console.error("Export failed:", err);
  }
};



  const handleEdit = (row: any) => {
    setSelectedRowData(row);
    setEditOpen(true);
  };

  const handleDelete = (row: any) => {
    console.log("Delete row:", row);
    // Implement deletion logic
  };

  return (
    <div>
      {/* Top bar: Export & Search */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4 mb-2">
        <ExportButtons handleExport={handleExport} />
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div
        ref={containerRef}
        className="overflow-auto max-h-[calc(100vh-250px)] border rounded-md"
      >
        <table className="min-w-full table-fixed text-sm border-collapse">
          <thead className="bg-blue-900 text-white sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortState = header.column.getIsSorted(); // 'asc' | 'desc' | false

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="border px-4 py-2 font-medium text-center cursor-pointer select-none"
                      onClick={
                        canSort
                          ? () => header.column.toggleSorting()
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {/* Sort Indicator */}
                        {sortState === "asc" && <span>▲</span>}
                        {sortState === "desc" && <span>▼</span>}
                      </div>
                    </th>
                  );
                })}
                {(action.edit || action.delete) && (
                  <th className="border px-4 py-2">Action</th>
                )}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="odd:bg-gray-50 even:bg-white hover:bg-blue-100 transition-colors"
              >
                {row.getVisibleCells().map((cell, idx) => {
                  const sticky =
                    isOverflowing && idx < 2
                      ? `sticky left-${idx * 120}px bg-blue-50 dark:bg-gray-700`
                      : "";
                  return (
                    <td
                      key={cell.id}
                      className={`border px-4 py-2 w-[120px] ${sticky}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
                {(action.edit || action.delete) && (
                  <td className="border px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      {action.edit && (
                        <button
                          onClick={() => handleEdit(row.original)}
                          className="bg-blue-900 text-white p-1 text-xs rounded hover:bg-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {action.delete && (
                        <button
                          onClick={() => handleDelete(row.original)}
                          className="bg-red-600 text-white p-1 text-xs rounded hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditModal
          isOpen={isEditOpen}
          onClose={() => setEditOpen(false)}
          onSubmit={(_data: Record<string, string>) => setEditOpen(false)}
          fields={table
            .getAllColumns()
            .filter((col) => col.getCanHide() && col.id !== "actions")
            .map((col) => ({
              name: col.id,
              label: col.columnDef.header as string,
              type: "text",
            }))}
          initialData={selectedRowData}
          title={title}
        />
      )}

      {/* Server-side Pagination */}
      {serverPagination && (
        <Pagination
          currentPage={serverPagination.currentPage}
          totalPages={serverPagination.totalPages}
          pageSize={serverPagination.pageSize}
          onPageChange={(p) => {
            serverPagination.setCurrentPage(p);
            serverPagination.fetchData();
          }}
          onPageSizeChange={(s) => {
            serverPagination.setPageSize(s);
            serverPagination.setCurrentPage(1);
            serverPagination.fetchData();
          }}
        />
      )}
    </div>
  );
}
