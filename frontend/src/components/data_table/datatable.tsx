// components/DataTable.tsx
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
import { Search, EditIcon, TrashIcon } from "lucide-react";

import { exportToCSV, exportToExcel, exportToPDF } from "./exportsData";
import ExportButtons from "./ExportButtons";
import { Pagination } from "./pagination";

import EditModal from "../model/EditModal";

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  title: string;
};

export function DataTable<T extends object>({
  data,
  columns,
  title,
}: Props<T>) {
  const [globalFilter, setGlobalFilter] = useState("");

  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const el = containerRef.current;
      if (el) {
        setIsOverflowing(el.scrollWidth > el.clientWidth);
      }
    };

    checkOverflow(); // Initial check
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // add this 👇
    initialState: {
      pagination: {
        pageSize: 13, // set initial page size to 15
      },
    },
  });

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

  const getExportColumns = () =>
    table.getVisibleFlatColumns().map((col) => col.id);

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    const rows = getExportData();
    const cols = getExportColumns();
    const fileName = "jurisdiction_data";

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
  const rowData = table.getRowModel().rows;
  console.log("Row Data:", rowData);

  const handleEdit = (_id: string, row: any) => {
    alert("Edit button clicked");
    setEditOpen(true);
    alert(isEditOpen ? "Edit Modal is open" : "Edit Modal is closed");

    console.log("Selected Row Data:", row);
    setSelectedRowData(row || null);
  };

  const handleDelete = (rowData: any) => {
    console.log("Delete:", rowData);
    // Handle DB deletion here
  };

  return (
    <div>
      {/* Top bar: Export & Search */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4 mb-2">
        {/* Export Buttons */}
        <div className="w-full md:w-auto">
          <ExportButtons handleExport={handleExport} />
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2  w-4 h-4 pointer-events-none" />
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
      <div
        ref={containerRef}
        className="overflow-auto max-h-[calc(100vh-250px)] border rounded-md"
      >
        <table className="min-w-full table-fixed text-sm border-collapse">
          <thead
            className=" bg-blue-900 hover:bg-blue-800
                text-white
                dark:bg-gray-600 dark:hover:bg-gray-700  sticky top-0 z-10"
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  let stickyClass = "";
                  if (isOverflowing) {
                    if (index === 0)
                      stickyClass =
                        "sticky left-0 z-20 bg-blue-900 dark:bg-gray-700";
                    if (index === 1)
                      stickyClass =
                        "sticky left-[120px] z-20 bg-blue-900 dark:bg-gray-700";
                  }

                  return (
                    <th
                      key={header.id}
                      className={`border px-4 py-2 w-[120px] font-medium cursor-pointer  transition ${stickyClass}`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex justify-between items-center">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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

                <th
                  className={`border px-4 py-2 w-[120px] font-medium cursor-pointer hover:bg-blue-800 transition   bg-blue-900" : ""}`}
                >
                  Action
                </th>
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="odd:bg-gray-50 even:bg-white hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
              >
                {row.getVisibleCells().map((cell, index) => {
                  let stickyClass = "";
                  if (isOverflowing) {
                    if (index === 0)
                      stickyClass = "sticky left-0 bg-blue-50 dark:bg-gray-700";
                    if (index === 1)
                      stickyClass =
                        "sticky left-[120px] bg-blue-50 dark:bg-gray-700";
                  }

                  return (
                    <td
                      key={cell.id}
                      className={`border px-4 py-2 w-[120px]  ${stickyClass}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}

                <td className="border px-4 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(row.id, row.original)}
                      className={` bg-blue-900 text-white p-1 text-xs rounded hover:bg-blue-800
                      
                    dark:bg-gray-600 dark:hover:bg-gray-700   ${
                      isOverflowing ? "sticky right-0 bg-blue-50" : ""
                    }`}
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(row.original)}
                      className="bg-red-600 text-white p-1 text-xs rounded hover:bg-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
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
          onSubmit={(data: Record<string, string>) => {
            console.log("Submitted data:", data);
            setEditOpen(false);
          }}
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

      {/* Pagination */}
     <Pagination
  currentPage={table.getState().pagination.pageIndex + 1}
  totalPages={table.getPageCount()}
  pageSize={table.getState().pagination.pageSize}
  onPageChange={(page) => table.setPageIndex(page - 1)}
  onPageSizeChange={(size) => table.setPageSize(size)}
/>
    </div>
  );
}
