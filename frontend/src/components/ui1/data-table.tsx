import * as React from "react"
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  Filter,
  MoreHorizontal,
  Search,
  Download,

  Check,
  X
} from "lucide-react"
import { cn } from "../../lib/utils"

import { Input } from "./form/input"
import { Badge } from "./form/badge"
import { Button } from "./form/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./form/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"
import { Checkbox } from "./form/checkbox"
import { Progress } from "./form/progress"
import { Skeleton } from "./form/skeleton"

// Types
export interface ColumnDef<T> {
  id: string
  header: string | React.ReactNode
  accessorKey?: keyof T
  cell?: (props: { row: T; getValue: () => any }) => React.ReactNode
  size?: number
  minSize?: number
  maxSize?: number
  enableSorting?: boolean
  enableFiltering?: boolean
  filterFn?: (row: T, value: any) => boolean
  sortFn?: (a: T, b: T) => number
  meta?: Record<string, any>
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  isLoading?: boolean
  loadingRows?: number
  emptyMessage?: string
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (search: string) => void
  filterable?: boolean
  filters?: Record<string, any>
  onFilterChange?: (filters: Record<string, any>) => void
  sortable?: boolean
  sortBy?: string
  sortDirection?: "asc" | "desc"
  onSortChange?: (sortBy: string, sortDirection: "asc" | "desc") => void
  selectable?: boolean
  selectedRows?: Set<string>
  onSelectionChange?: (selectedRows: Set<string>) => void
  rowIdKey?: string
  pagination?: {
    pageIndex: number
    pageSize: number
    total: number
    onPageChange: (pageIndex: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  actions?: {
    label: string
    icon?: React.ReactNode
    onClick: (selectedRows: Set<string>) => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }[]
  rowActions?: (row: T) => {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }[]
  onRowClick?: (row: T) => void
  className?: string
  variant?: "default" | "bordered" | "striped" | "compact"
  size?: "sm" | "md" | "lg"
  hoverable?: boolean
}

// Sorting Hook
function useSort<T>(
  data: T[],
  sortBy?: string,
  sortDirection?: "asc" | "desc",
  columns?: ColumnDef<T>[]
) {
  return React.useMemo(() => {
    if (!sortBy || !sortDirection) return data

    const column = columns?.find(col => col.id === sortBy)
    if (!column) return data

    return [...data].sort((a, b) => {
      if (column.sortFn) {
        return column.sortFn(a, b) * (sortDirection === "asc" ? 1 : -1)
      }

      const aValue = column.accessorKey ? a[column.accessorKey] : null
      const bValue = column.accessorKey ? b[column.accessorKey] : null

      if (aValue === bValue) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      return aValue < bValue 
        ? (sortDirection === "asc" ? -1 : 1)
        : (sortDirection === "asc" ? 1 : -1)
    })
  }, [data, sortBy, sortDirection, columns])
}

// Filtering Hook
function useFilter<T>(
  data: T[],
  filters?: Record<string, any>,
  columns?: ColumnDef<T>[]
) {
  return React.useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return data

    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true

        const column = columns?.find(col => col.id === key)
        if (!column) return true

        if (column.filterFn) {
          return column.filterFn(row, value)
        }

        const cellValue = column.accessorKey 
          ? row[column.accessorKey]
          : null

        if (cellValue == null) return false

        const searchString = String(cellValue).toLowerCase()
        const filterString = String(value).toLowerCase()

        return searchString.includes(filterString)
      })
    })
  }, [data, filters, columns])
}

// Pagination Hook
function usePagination<T>(
  data: T[],
  pageIndex: number,
  pageSize: number
) {
  return React.useMemo(() => {
    const start = pageIndex * pageSize
    const end = start + pageSize
    return data.slice(start, end)
  }, [data, pageIndex, pageSize])
}

// Main DataTable Component
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  loadingRows = 5,
  emptyMessage = "No data available",
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  filterable = false,
  filters = {},
  onFilterChange,
  sortable = false,
  sortBy,
  sortDirection,
  onSortChange,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  rowIdKey = "id",
  pagination,
  actions = [],
  rowActions,
  onRowClick,
  className,
  variant = "default",
  size = "md",
  hoverable = true,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("")
  const [localFilters, setLocalFilters] = React.useState(filters)
  const [localSortBy, setLocalSortBy] = React.useState(sortBy)
  const [localSortDirection, setLocalSortDirection] = React.useState(sortDirection)
  const [localSelectedRows, setLocalSelectedRows] = React.useState(selectedRows)

  // Handle search
  const handleSearch = React.useCallback((value: string) => {
    setSearch(value)
    onSearch?.(value)
  }, [onSearch])

  // Handle filter change
  const handleFilterChange = React.useCallback((key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFilterChange?.(newFilters)
  }, [localFilters, onFilterChange])

  // Handle sort change
  const handleSortChange = React.useCallback((columnId: string) => {
    if (!sortable) return

    let newSortDirection: "asc" | "desc" = "asc"
    if (localSortBy === columnId) {
      newSortDirection = localSortDirection === "asc" ? "desc" : "asc"
    }

    setLocalSortBy(columnId)
    setLocalSortDirection(newSortDirection)
    onSortChange?.(columnId, newSortDirection)
  }, [sortable, localSortBy, localSortDirection, onSortChange])

  // Handle row selection
  const handleRowSelect = React.useCallback((rowId: string) => {
    const newSelected = new Set(localSelectedRows)
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId)
    } else {
      newSelected.add(rowId)
    }
    setLocalSelectedRows(newSelected)
    onSelectionChange?.(newSelected)
  }, [localSelectedRows, onSelectionChange])

  // Handle select all
  const handleSelectAll = React.useCallback(() => {
    const visibleData = getVisibleData()
    const allIds = new Set(visibleData.map(row => row[rowIdKey]))
    
    if (localSelectedRows.size === allIds.size) {
      // Deselect all
      setLocalSelectedRows(new Set())
      onSelectionChange?.(new Set())
    } else {
      // Select all
      setLocalSelectedRows(allIds)
      onSelectionChange?.(allIds)
    }
  }, [localSelectedRows, onSelectionChange])

  // Get visible data after filtering and sorting
  const getVisibleData = React.useCallback(() => {
    let filteredData = useFilter(data, localFilters, columns)
    
    if (search) {
      filteredData = filteredData.filter(row => {
        return columns.some(column => {
          const cellValue = column.accessorKey 
            ? row[column.accessorKey]
            : null
          
          if (cellValue == null) return false
          
          const searchString = String(cellValue).toLowerCase()
          return searchString.includes(search.toLowerCase())
        })
      })
    }
    
    const sortedData = useSort(filteredData, localSortBy, localSortDirection, columns)
    
    if (pagination) {
      return usePagination(sortedData, pagination.pageIndex, pagination.pageSize)
    }
    
    return sortedData
  }, [data, localFilters, search, localSortBy, localSortDirection, columns, pagination])

  const visibleData = getVisibleData()
  const totalRows = data.length
  const selectedCount = localSelectedRows.size

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        {/* Table skeleton */}
        <div className="border rounded-lg">
          <Table variant={variant} size={size}>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                )}
                {columns.map((_, index) => (
                  <TableHead key={index}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
                {rowActions && (
                  <TableHead className="w-12">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {selectable && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {columns.map((_column, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left side: Search and filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          {searchable && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          )}
          
          {filterable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {Object.values(localFilters).filter(Boolean).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.values(localFilters).filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns
                  .filter(col => col.enableFiltering)
                  .map(column => (
                    <div key={column.id} className="px-2 py-1.5">
                      <label className="text-xs font-medium mb-1 block">
                        {typeof column.header === 'string' ? column.header : column.id}
                      </label>
                      <Input
                        placeholder="Filter..."
                        value={localFilters[column.id] || ""}
                        onChange={(e) => handleFilterChange(column.id, e.target.value)}
                        className="h-8"
                      />
                    </div>
                  ))}
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    setLocalFilters({})
                    onFilterChange?.({})
                  }}
                >
                  Clear Filters
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right side: Actions and export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <Badge variant="secondary">
                {selectedCount} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocalSelectedRows(new Set())
                  onSelectionChange?.(new Set())
                }}
              >
                Clear
              </Button>
            </div>
          )}

          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              onClick={() => action.onClick(localSelectedRows)}
              disabled={selectedCount === 0 && action.variant !== "default"}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCSV(visibleData, columns)}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToJSON(visibleData)}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(visibleData, columns)}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table 
          variant={variant} 
          size={size} 
          hoverable={hoverable}
          selectable={selectable}
          selectedRows={localSelectedRows}
          onRowSelect={handleRowSelect}
        >
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={visibleData.length > 0 && localSelectedRows.size === visibleData.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.id}
                  className={cn(
                    column.enableSorting && "cursor-pointer select-none",
                    column.size && `w-[${column.size}px]`
                  )}
                  onClick={() => column.enableSorting && handleSortChange(column.id)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.enableSorting && (
                      <span className="flex items-center">
                        {localSortBy === column.id ? (
                          localSortDirection === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-12">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <div className="mb-2">{emptyMessage}</div>
                    {search && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch("")}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visibleData.map((row, rowIndex) => {
                const rowId = row[rowIdKey]
                const isSelected = localSelectedRows.has(rowId)
                
                return (
                  <TableRow
                    key={rowIndex}
                    rowId={rowId}
                    isSelected={isSelected}
                    onClick={() => onRowClick?.(row)}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleRowSelect(rowId)}
                          aria-label="Select row"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const cellValue = column.accessorKey 
                        ? row[column.accessorKey]
                        : null
                      
                      return (
                        <TableCell key={column.id}>
                          {column.cell 
                            ? column.cell({ row, getValue: () => cellValue })
                            : formatCellValue(cellValue, column.meta?.type)
                          }
                        </TableCell>
                      )
                    })}
                    {rowActions && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions(row).map((action, index) => (
                             <DropdownMenuItem
                                  key={index}
                                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                    e.stopPropagation();
                                    action.onClick();
                                  }}
                                  className={cn(
                                    action.variant === "destructive" && "text-red-600"
                                  )}
                                >
                                  {action.icon && <span className="mr-2">{action.icon}</span>}
                                  {action.label}
                                </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: Pagination and stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <div>
          Showing {visibleData.length} of {totalRows} records
          {search && " (filtered)"}
        </div>
        
        {pagination && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
                disabled={pagination.pageIndex === 0}
              >
                Previous
              </Button>
              
              <span>
                Page {pagination.pageIndex + 1} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
                disabled={pagination.pageIndex >= Math.ceil(pagination.total / pagination.pageSize) - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions
function formatCellValue(value: any, type?: string): React.ReactNode {
  if (value == null) return <span className="text-gray-400">—</span>
  
  switch (type) {
    case "date":
      return new Date(value).toLocaleDateString()
    case "datetime":
      return new Date(value).toLocaleString()
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(Number(value))
    case "percentage":
      return `${Number(value).toFixed(2)}%`
    case "number":
      return new Intl.NumberFormat().format(Number(value))
    case "boolean":
      return value ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )
    case "badge":
      return <Badge variant="secondary">{String(value)}</Badge>
    case "progress":
      return (
        <div className="flex items-center gap-2">
          <Progress value={Number(value)} className="w-16" />
          <span>{value}%</span>
        </div>
      )
    default:
      return String(value)
  }
}

function exportToCSV<T>(data: T[], columns: ColumnDef<T>[]) {
  const headers = columns.map(col => 
    typeof col.header === 'string' ? col.header : col.id
  )
  
  const rows = data.map(row => 
    columns.map(col => {
      const value = col.accessorKey ? row[col.accessorKey] : null
      return JSON.stringify(value)
    }).join(',')
  )
  
  const csv = [headers.join(','), ...rows].join('\n')
  downloadFile(csv, 'data.csv', 'text/csv')
}

function exportToJSON<T>(data: T[]) {
  const json = JSON.stringify(data, null, 2)
  downloadFile(json, 'data.json', 'application/json')
}

function exportToExcel<T>(_data: T[], _columns: ColumnDef<T>[]) {
  // Implement Excel export using a library like xlsx
  console.log("Excel export not implemented. Use a library like 'xlsx'")
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}