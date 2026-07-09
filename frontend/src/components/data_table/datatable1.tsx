import { useEffect, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

import { Search, EditIcon, TrashIcon } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "./exportsData";
import ExportButtons from "./ExportButtons";
import { Pagination } from "./pagination";
import EditModal from "../model/EditModal";

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  title: string;
  action: {
    edit?: boolean;
    delete?: boolean;
  };
  file_name?: string;

  // Server-side pagination
  serverPagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    setCurrentPage: (page: number) => void;
    setPageSize: (size: number) => void;
    fetchData: () => void;
  };
//  onSearchChange?: (value: string) => void;
onSortChange?: (value: string) => void;
};

export function DataTable<T extends object>({
  data,
  columns,
  title,
  action,
  file_name,
  serverPagination,
}: Props<T>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const el = containerRef.current;
      if (el) setIsOverflowing(el.scrollWidth > el.clientWidth);
    };
    const timer = setTimeout(checkOverflow, 100);
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [data, columns]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const getExportData = () =>
    table.getRowModel().rows.map((row) =>
      row.getVisibleCells().reduce((acc, cell) => {
        acc[cell.column.id] = cell.getValue();
        return acc;
      }, {} as Record<string, any>)
    );

  const getExportColumns = () =>
    table.getVisibleFlatColumns().map((col) => col.id);

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    const rows = getExportData();
    const cols = getExportColumns();
    const fileName = file_name || "data_export";

    switch (format) {
      case "csv":
        exportToCSV(rows, cols, fileName);
        break;
      case "excel":
        exportToExcel(rows, cols, fileName);
        break;
      case "pdf":
        exportToPDF(rows, cols, fileName);
        break;
    }
  };

  const handleEdit = (_id: string, row: any) => {
    setEditOpen(true);
    setSelectedRowData(row || null);
  };

  const handleDelete = (rowData: any) => {
    console.log("Delete:", rowData);
    // DB deletion logic
  };

  return (
    <div>
      {/* Top bar: Export & Search */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4 mb-2">
        <div className="w-full md:w-auto">
          <ExportButtons handleExport={handleExport} />
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      <div ref={containerRef} className="overflow-auto max-h-[calc(100vh-250px)] border rounded-md">
        <table className="min-w-full table-fixed text-sm border-collapse">
          <thead className="bg-[#0f4c81] text-white sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  let stickyClass = "";
                  if (isOverflowing) {
                    if (index === 0) stickyClass = "sticky left-0 z-20 bg-blue-900 dark:bg-gray-700";
                    if (index === 1) stickyClass = "sticky left-[120px] z-20 bg-blue-900 dark:bg-gray-700";
                  }
                  return (
                    <th
                      key={header.id}
                      className={`border px-4 py-2 w-[120px] font-medium cursor-pointer ${stickyClass}`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex justify-between items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="ml-1 text-xs">
                          {{
                            asc: "▲",
                            desc: "▼",
                          }[header.column.getIsSorted() as string] ?? ""}
                        </span>
                      </div>
                    </th>
                  );
                })}
                {(action.edit || action.delete) && <th className="border px-4 py-2 w-[120px] font-medium">Action</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="odd:bg-gray-50 even:bg-white hover:bg-blue-100 dark:hover:bg-gray-700 dark:bg-slate-600 transition-colors">
                {row.getVisibleCells().map((cell, index) => {
                  let stickyClass = "";
                  if (isOverflowing) {
                    if (index === 0) stickyClass = "sticky left-0 bg-blue-50 dark:bg-gray-700";
                    if (index === 1) stickyClass = "sticky left-[120px] bg-blue-50 dark:bg-gray-700";
                  }
                  return <td key={cell.id} className={`border px-4 py-2 w-[120px] ${stickyClass}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>;
                })}
                {(action.edit || action.delete) && (
                  <td className="border px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      {action.edit && <button onClick={() => handleEdit(row.id, row.original)} className="bg-blue-900 text-white p-1 text-xs rounded hover:bg-blue-800"><EditIcon className="w-4 h-4" /></button>}
                      {action.delete && <button onClick={() => handleDelete(row.original)} className="bg-red-600 text-white p-1 text-xs rounded hover:bg-red-700"><TrashIcon className="w-4 h-4" /></button>}
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
          onSubmit={(_data) => setEditOpen(false)}
          fields={table.getAllColumns().map((col) => ({ name: col.id, label: col.columnDef.header as string, type: "text" }))}
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
          onPageChange={(p) => { serverPagination.setCurrentPage(p); serverPagination.fetchData(); }}
          onPageSizeChange={(s) => { serverPagination.setPageSize(s); serverPagination.setCurrentPage(1); serverPagination.fetchData(); }}
        />
      )}
    </div>
  );
}