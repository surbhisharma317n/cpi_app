// components/ui2/table/types.ts

import type { ColumnDef } from "@tanstack/react-table";

/* ================================
   ✅ BASIC TYPES
================================ */
export type TableVariant = "default" | "bordered" | "striped" | "hover";
export type TableSize = "sm" | "md" | "lg";
export type Alignment = "left" | "center" | "right";
export type SortDirection = "asc" | "desc" | "none";

/* ================================
   ✅ CUSTOM COLUMN (for header / sorting UI)
   ⚠️ NOT TanStack ColumnDef
================================ */
export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: Alignment;
  width?: number | string;
  className?: string;

  // optional render helpers (only if you still use them somewhere)
  accessor?: (row: T) => React.ReactNode;
  cell?: (value: any, row: T) => React.ReactNode;
}

/* ================================
   ✅ TANSTACK META (used in Table.tsx)
================================ */
export interface ColumnMeta {
  key?: string;
  align?: Alignment;
  className?: string;
  cellClassName?: string;
  width?: number | string;
}

/* ================================
   ✅ SORT TYPES
================================ */
export interface TableSortState {
  column: string;
  direction: SortDirection;
}

/* ================================
   ✅ TABLE PROPS (TanStack आधारित)
================================ */
export interface TableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string;

  variant?: TableVariant;
  size?: TableSize;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;

  rowClassName?: string | ((item: T, index: number) => string);
  onRowClick?: (item: T, index: number) => void;

  // optional sorting support
  sortable?: boolean;
  onSortChange?: (sort: TableSortState) => void;
  sortState?: TableSortState;
}

/* ================================
   ✅ UPLOAD TYPES
================================ */
export interface UploadFile {
  file_id: string;
  file_name: string;
  status:
    | "pending"
    | "uploading"
    | "validating"
    | "success"
    | "error"
    | "warning";
  progress: number;
  size: string;
  uploaded_at: string;
  validation_result?: any;
  message?: string;
}

/* ================================
   ✅ VALIDATION RESULT
================================ */
export interface ValidationResult {
  file_name: string;
  status: "success" | "failed" | "error";
  message: string;
  missing_columns: string[];
  extra_columns: string[];
  row_count: number;
  file_size: string;
  errors: string[];
  warnings: string[];

  data_summary?: {
    numeric_columns: string[];
    categorical_columns: string[];
    null_counts: Record<string, number>;
    unique_counts: Record<string, number>;
  };
}