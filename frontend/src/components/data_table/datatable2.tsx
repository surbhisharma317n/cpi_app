// components/DataTable.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Search,
  EditIcon,
  TrashIcon,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,

  Eye,

  RefreshCw,
} from "lucide-react";

import { exportToCSV, exportToExcel, exportToPDF } from "./exportsData";

import EditModal from "../model/EditModal";
import ExportButtons from "./ExportButtons";

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  title: string;
  action: {
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
  };
  file_name?: string;
  onRefresh?: () => void;
  loading?: boolean;
  selectable?: boolean;
  onRowSelect?: (selectedRows: T[]) => void;
};

export function DataTable<T extends object>({
  data,
  columns,
  title,
  action,
  file_name,
  onRefresh,
  loading = false,
  selectable = false,
  onRowSelect,
}: Props<T>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Enhanced scroll and overflow detection
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const hasHorizontalOverflow = container.scrollWidth > container.clientWidth;
      setIsOverflowing(hasHorizontalOverflow);
    };

    const handleScroll = () => {
      setScrollPosition(container.scrollLeft);
      if (headerRef.current) {
        headerRef.current.scrollLeft = container.scrollLeft;
      }
    };

    checkOverflow();
    
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);
    
    container.addEventListener("scroll", handleScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [data]);

  // Sync header scroll with body
  useEffect(() => {
    if (headerRef.current && tableContainerRef.current) {
      headerRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, [scrollPosition]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
      columnFilters,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: selectable,
    initialState: {
      pagination: {
        pageSize: 13,
      },
    },
  });

  // Handle row selection change
  useEffect(() => {
    if (onRowSelect) {
      const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
      onRowSelect(selectedRows);
    }
  }, [rowSelection, onRowSelect, table]);

  // Export functions
  const getExportData = useCallback(
    () =>
      table.getFilteredRowModel().rows.map((row) =>
        row.getVisibleCells().reduce(
          (acc, cell) => {
            acc[cell.column.id] = cell.getValue();
            return acc;
          },
          {} as Record<string, any>
        )
      ),
    [table]
  );

  const getExportColumns = useCallback(
    () => table.getVisibleFlatColumns().map((col) => col.id),
    [table]
  );

  const handleExport = useCallback(
    (format: "csv" | "excel" | "pdf") => {
      const rows = getExportData();
      const cols = getExportColumns();
      const fileName = file_name || "jurisdiction_data";

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
    },
    [getExportData, getExportColumns, file_name]
  );

  const handleEdit = useCallback((_id: string, row: any) => {
    setEditOpen(true);
    setSelectedRowData(row || null);
  }, []);

  const handleDelete = useCallback((rowData: any) => {
    console.log("Delete:", rowData);
  }, []);

  const handleModalSubmit = useCallback(() => {
    setEditOpen(false);
  }, []);

  const clearFilters = useCallback(() => {
    setGlobalFilter("");
    setColumnFilters([]);
  }, []);

 const modalFields = table
  .getAllColumns()
  .filter((col) => col.getCanHide() && col.id !== "actions")
  .map((col) => ({
    name: col.id,
    label: col.columnDef.header as string,
    type: "text" as const, // ✅ FIX
  }));

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-950">
      {/* Enterprise Header Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          {/* Title and Actions Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {table.getFilteredRowModel().rows.length.toLocaleString()} records
                </span>
                {selectedCount > 0 && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {selectedCount} selected
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                </button>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              <ExportButtons handleExport={handleExport} />
            </div>
          </div>

          {/* Search and Filters Row */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search across all columns..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                {table.getAllColumns()
                  .filter(col => col.getCanHide() && col.id !== "actions" && col.id !== "select")
                  .slice(0, 4)
                  .map(column => (
                    <div key={column.id} className="space-y-1">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                      </label>
                      <input
                        type="text"
                        placeholder={`Filter ${column.id}...`}
                        value={(column.getFilterValue() as string) ?? ""}
                        onChange={(e) => column.setFilterValue(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                {(globalFilter || columnFilters.length > 0) && (
                  <button
                    onClick={clearFilters}
                    className="self-end px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Container with Fixed Header */}
      <div className="flex-1 overflow-hidden relative">
        {/* Header Scroll Container */}
        <div
          ref={headerRef}
          className="overflow-x-hidden border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
          style={{ overflowY: "hidden" }}
        >
          <table className="min-w-max table-fixed" style={{ minWidth: "100%" }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {selectable && (
                    <th className="sticky left-0 z-30 w-12 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                      <input
                        type="checkbox"
                        checked={table.getIsAllRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  {headerGroup.headers.map((header, index) => {
                    const isSorted = header.column.getIsSorted();
                    const isLastSticky = index === 2 && isOverflowing;
                    
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={`
                          px-4 py-3
                          w-[140px] min-w-[140px] max-w-[140px]
                          text-left text-xs font-semibold uppercase tracking-wider
                          text-gray-700 dark:text-gray-300
                          bg-gray-50 dark:bg-gray-900
                          border-r border-gray-200 dark:border-gray-800
                          cursor-pointer select-none
                          transition-colors duration-200
                          hover:bg-gray-100 dark:hover:bg-gray-800
                          ${index < 3 && isOverflowing ? "sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""}
                          ${index === 0 && isOverflowing ? "left-0" : ""}
                          ${index === 1 && isOverflowing ? "left-[140px]" : ""}
                          ${index === 2 && isOverflowing ? "left-[280px]" : ""}
                          ${isLastSticky ? "after:content-[''] after:absolute after:top-0 after:right-0 after:h-full after:w-px after:bg-gray-300 dark:after:bg-gray-700" : ""}
                        `}
                        style={{
                          left: index === 0 && isOverflowing ? 0 : 
                                 index === 1 && isOverflowing ? 140 : 
                                 index === 2 && isOverflowing ? 280 : "auto"
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          <div className="flex items-center gap-1">
                            {isSorted === "asc" && <ChevronUp className="w-3 h-3" />}
                            {isSorted === "desc" && <ChevronDown className="w-3 h-3" />}
                            {header.column.getCanFilter() && (
                              <Filter className="w-3 h-3 opacity-50" />
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  {(action.edit || action.delete || action.view) && (
                    <th className="sticky right-0 z-30 w-24 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        Actions
                      </span>
                    </th>
                  )}
                </tr>
              ))}
            </thead>
          </table>
        </div>

        {/* Body Scroll Container */}
        <div
          ref={tableContainerRef}
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <table className="min-w-max table-fixed" style={{ minWidth: "100%" }}>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (action.edit || action.delete ? 1 : 0)}>
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (action.edit || action.delete ? 1 : 0)}>
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Search className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No data found
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Try adjusting your search or filters to find what you're looking for.
                        </p>
                        {(globalFilter || columnFilters.length > 0) && (
                          <button
                            onClick={clearFilters}
                            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className={`
                      group transition-all duration-150
                      ${rowIndex % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-950"}
                      hover:bg-blue-50 dark:hover:bg-gray-800
                      ${row.getIsSelected() ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                    `}
                  >
                    {selectable && (
                      <td className="sticky left-0 z-20 w-12 px-4 py-3 bg-inherit border-r border-gray-200 dark:border-gray-800">
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell, index) => {
                      const isLastSticky = index === 2 && isOverflowing;
                      
                      return (
                        <td
                          key={cell.id}
                          className={`
                            px-4 py-3
                            w-[140px] min-w-[140px] max-w-[140px]
                            border-r border-gray-200 dark:border-gray-800
                            text-sm text-gray-900 dark:text-gray-100
                            align-middle
                            ${index < 3 && isOverflowing ? "sticky z-10 bg-inherit" : ""}
                            ${index === 0 && isOverflowing ? "left-0" : ""}
                            ${index === 1 && isOverflowing ? "left-[140px]" : ""}
                            ${index === 2 && isOverflowing ? "left-[280px]" : ""}
                            ${isLastSticky ? "after:content-[''] after:absolute after:top-0 after:right-0 after:h-full after:w-px after:bg-gray-200 dark:after:bg-gray-700" : ""}
                          `}
                          style={{
                            left: index === 0 && isOverflowing ? 0 : 
                                   index === 1 && isOverflowing ? 140 : 
                                   index === 2 && isOverflowing ? 280 : "auto"
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                    
                    {(action.edit || action.delete || action.view) && (
                      <td className="sticky right-0 z-20 w-24 px-4 py-3 bg-inherit border-l border-gray-200 dark:border-gray-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-center gap-1.5">
                          {action.view && (
                            <button
                              onClick={() => handleEdit(row.id, row.original)}
                              className="p-1.5 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {action.edit && (
                            <button
                              onClick={() => handleEdit(row.id, row.original)}
                              className="p-1.5 rounded-md text-gray-600 hover:text-green-600 hover:bg-green-50 dark:text-gray-400 dark:hover:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                              title="Edit"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                          )}
                          {action.delete && (
                            <button
                              onClick={() => handleDelete(row.original)}
                              className="p-1.5 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enterprise Pagination */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 13, 20, 30, 50].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount().toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditModal
          isOpen={isEditOpen}
          onClose={() => setEditOpen(false)}
          onSubmit={handleModalSubmit}
          fields={modalFields}
          initialData={selectedRowData}
          title={`Edit ${title.slice(0, -1)}`}
        />
      )}
    </div>
  );
}