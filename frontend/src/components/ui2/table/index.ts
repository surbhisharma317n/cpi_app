// components/ui2/table/index.ts
// Core components
export { DataTable } from "./DataTable";
export { TableLoading } from "./TableLoading";
export { TableEmpty } from "./TableEmpty";

// Specialized tables
export { FileUploadTable } from "./FileUploadTable";

// Utilities
export { createColumn, columnTypes, columnHelper } from "./column-builder";
export { cn, formatFileSize, getStatusColor } from "./utils";

// Types
export type {
  TableVariant,
  TableSize,
  UploadFile,
  ValidationResult,
  ColumnMeta,
} from "./types";

// TanStack Table types
export type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
