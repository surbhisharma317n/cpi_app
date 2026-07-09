import React from "react";
import { cn } from "../../../lib/utils";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { type TableProps } from "./types";
import { TableLoading } from "./TableLoading";
import { TableEmpty } from "./TableEmpty";

const Table = React.forwardRef<HTMLDivElement, TableProps<any>>(
  (
    {
      data,
      columns,
      loading = false,
      emptyState,
      className,
      size = "md",
    },
    ref
  ) => {
    const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    if (loading) {
      return <TableLoading columns={columns.length} size={size} />;
    }

    if (!data.length && emptyState) return <>{emptyState}</>;
    if (!data.length) return <TableEmpty />;

    return (
      <div
        ref={ref}
        className={cn("w-full overflow-auto border rounded-lg", className)}
      >
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-gray-700"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

Table.displayName = "Table";
export { Table };