// components/ui2/table/column-builder.tsx

import type { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { cn } from "./utils";
import type { ColumnMeta } from "./types";
import React from "react";

export const columnHelper = createColumnHelper<any>();

/* ================================
   ✅ STATUS CONFIG
================================ */
const DEFAULT_STATUS_CONFIG = {
  success: { icon: FiCheckCircle, color: "text-green-600", bg: "bg-green-100" },
  error: { icon: FiXCircle, color: "text-red-600", bg: "bg-red-100" },
  warning: {
    icon: FiAlertCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
  },
  uploading: { icon: FiLoader, color: "text-blue-600", bg: "bg-blue-100" },
  validating: { icon: FiLoader, color: "text-blue-600", bg: "bg-blue-100" },
  pending: { icon: FiAlertCircle, color: "text-gray-600", bg: "bg-gray-100" },
  default: { icon: FiAlertCircle, color: "text-gray-600", bg: "bg-gray-100" },
} as const;

/* ================================
   ✅ ACTION TYPE
================================ */
export interface ColumnAction<TData> {
  label?: string;
  icon?: React.ReactNode;
  onClick: (row: TData) => void;
  disabled?: (row: TData) => boolean;
  variant?: "primary" | "danger" | "ghost" | "default";
}

/* ================================
   ✅ GENERIC COLUMN BUILDER (FINAL FIX)
================================ */
export function createColumn<TData>(
  id: string,
  header: string,
  options?: {
    accessor?: keyof TData | ((row: TData) => unknown);
    cell?: (value: unknown, row: TData) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    meta?: ColumnMeta;
  }
): ColumnDef<TData, unknown> {
  const {
    accessor,
    cell,
    sortable = true,
    filterable = false,
    meta,
  } = options || {};

  const base = {
    id,
    header,
    enableSorting: sortable,
    enableColumnFilter: filterable,
    meta: meta as any,
  };

  // ✅ accessorFn
  if (typeof accessor === "function") {
    return {
      ...base,
      accessorFn: accessor,
      cell: ({ row, getValue }) => {
        const value = getValue();
        return cell ? cell(value, row.original) : value ?? "-";
      },
    };
  }

  // ✅ accessorKey
  if (typeof accessor === "string") {
    return {
      ...base,
      accessorKey: accessor,
      cell: ({ row, getValue }) => {
        const value = getValue();
        return cell ? cell(value, row.original) : value ?? "-";
      },
    };
  }

  // ✅ display column
  return {
    ...base,
    cell: ({ row }) =>
      cell ? cell(undefined, row.original) : "-",
  };
}

/* ================================
   ✅ PREBUILT COLUMN TYPES (FIXED)
================================ */
export const columnTypes = {
  /* ---------- STATUS ---------- */
  status: <TData extends { status: string }>(
    id = "status",
    header = "Status"
  ): ColumnDef<TData, unknown> => {
    return createColumn<TData>(id, header, {
      accessor: (row) => row.status,
      cell: (value) => {
        const status = String(value || "").toLowerCase();

        const config =
          DEFAULT_STATUS_CONFIG[
            status as keyof typeof DEFAULT_STATUS_CONFIG
          ] || DEFAULT_STATUS_CONFIG.default;

        const Icon = config.icon;

        return (
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full", config.bg)}>
            <Icon className={cn("w-4 h-4", config.color)} />
            <span className={cn("text-sm font-medium", config.color)}>
              {value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : "Unknown"}
            </span>
          </div>
        );
      },
      meta: { align: "center" },
    });
  },

  /* ---------- DATE ---------- */
  date: <TData,>(
    id: string,
    header: string,
    formatOptions?: Intl.DateTimeFormatOptions
  ): ColumnDef<TData, unknown> => {
    return createColumn<TData>(id, header, {
      accessor: id as keyof TData,
      cell: (value) => {
        if (!value) return "-";

        const date = value instanceof Date ? value : new Date(value as any);
        if (isNaN(date.getTime())) return "-";

        return date.toLocaleDateString(
          "en-US",
          formatOptions || {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }
        );
      },
    });
  },

  /* ---------- PROGRESS ---------- */
  progress: <TData,>(
    id = "progress",
    header = "Progress"
  ): ColumnDef<TData, unknown> => {
    return createColumn<TData>(id, header, {
      accessor: id as keyof TData,
      cell: (value) => {
        const progress = Math.min(100, Math.max(0, Number(value) || 0));

        return (
          <div className="flex flex-col gap-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 text-right">
              {progress}%
            </span>
          </div>
        );
      },
      meta: { width: "200px" },
    });
  },

  /* ---------- ACTIONS ---------- */
  actions: <TData,>(
    actions: ColumnAction<TData>[],
    header = "Actions"
  ): ColumnDef<TData, unknown> => {
    return createColumn<TData>(header.toLowerCase(), header, {
      cell: (_, row) => (
        <div className="flex items-center gap-2">
          {actions.map((action, index) => {
            const disabled = action.disabled?.(row);

            return (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) action.onClick(row);
                }}
                disabled={disabled}
                className={cn(
                  "px-3 py-1 text-sm rounded flex items-center gap-1",
                  disabled && "opacity-50 cursor-not-allowed",
                  action.variant === "danger"
                    ? "bg-red-100 text-red-700"
                    : action.variant === "primary"
                    ? "bg-blue-100 text-blue-700"
                    : action.variant === "ghost"
                    ? "hover:bg-gray-100"
                    : "bg-gray-100"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      ),
      meta: { align: "center" },
    });
  },

  /* ---------- NUMERIC ---------- */
  numeric: <TData,>(
    id: string,
    header: string
  ): ColumnDef<TData, unknown> => {
    return createColumn<TData>(id, header, {
      accessor: id as keyof TData,
      cell: (value) =>
        value === null || value === undefined
          ? "-"
          : Number(value).toLocaleString(),
      meta: { align: "right" },
    });
  },

  /* ---------- BOOLEAN ---------- */
  boolean: <TData,>(
    id: string,
    header: string
  ): ColumnDef<TData, unknown> => {
    return createColumn<TData>(id, header, {
      accessor: id as keyof TData,
      cell: (value) => (
        <span
          className={cn(
            "px-2 py-1 rounded-full text-xs",
            value
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          )}
        >
          {value ? "Yes" : "No"}
        </span>
      ),
      meta: { align: "center" },
    });
  },
};