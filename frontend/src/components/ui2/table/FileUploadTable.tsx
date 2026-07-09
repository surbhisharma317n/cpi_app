"use client";

import { DataTable } from "./DataTable";
import { createColumn, columnTypes } from "./column-builder";
import {
  FiEye,
  FiTrash2,
  FiRefreshCw,
  FiDownload,
  FiAlertCircle,
} from "react-icons/fi";
import { Button } from "../button";
import { cn } from "./utils";
import type { UploadFile } from "./types";

interface FileUploadTableProps {
  files: UploadFile[];
  loading?: boolean;
  onViewDetails?: (file: UploadFile) => void;
  onRetry?: (file: UploadFile) => void;
  onDelete?: (file: UploadFile) => void;
  onDownload?: (file: UploadFile) => void;
  className?: string;
}

export function FileUploadTable({
  files,
  loading,
  onViewDetails,
  onRetry,
  onDelete,
  onDownload,
  className,
}: FileUploadTableProps) {
  const columns = [
    // ✅ FILE NAME COLUMN
    createColumn<UploadFile>("file_name", "File Name", {
      cell: (value:any, row) => (
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-gray-900 truncate">
            {value || "-"}
          </span>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{row.size}</span>

            {row.message && (
              <span className="text-xs text-yellow-600 flex items-center gap-1">
                <FiAlertCircle className="h-3 w-3" />
                {row.message}
              </span>
            )}
          </div>
        </div>
      ),
      meta: { width: "35%" },
    }),

    // ✅ STATUS
    columnTypes.status<UploadFile>("status", "Status"),

    // ✅ PROGRESS
    columnTypes.progress<UploadFile>("progress", "Progress"),

    // ✅ UPLOADED TIME
    createColumn<UploadFile>("uploaded_at", "Uploaded", {
      cell: (value:any) => {
        if (!value) return "-";

        const date = new Date(value);

        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      },
      meta: { align: "center", width: "100px" },
    }),

    // ✅ ACTIONS
    createColumn<UploadFile>("file_name", "Actions", {
      cell: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          {/* View */}
          {row.validation_result && onViewDetails && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onViewDetails(row)}
              title="View details"
            >
              <FiEye className="h-4 w-4" />
            </Button>
          )}

          {/* Retry */}
          {row.status === "error" && onRetry && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRetry(row)}
              title="Retry upload"
            >
              <FiRefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Download */}
          {row.status === "success" && onDownload && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDownload(row)}
              title="Download file"
            >
              <FiDownload className="h-4 w-4" />
            </Button>
          )}

          {/* Delete */}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(row)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete file"
            >
              <FiTrash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      meta: { align: "right", width: "140px" },
    }),
  ];

  return (
    <DataTable
      data={files}
      columns={columns}
      loading={loading}
      variant="bordered"
      size="sm"
      className={className}
      onRowClick={onViewDetails}
      getRowClassName={(row) =>
        cn(
          row.status === "error" && "bg-red-50/30",
          row.status === "warning" && "bg-yellow-50/30",
          (row.status === "uploading" || row.status === "validating") &&
            "bg-blue-50/30"
        )
      }
    />
  );
}