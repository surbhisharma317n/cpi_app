import React from "react";
import Tooltip from "./tooltip";

interface ErrorTableRowProps {
rowData: Record<string, any>;
columns: { accessorKey: string; header: string }[];
rowError?: string;
}

const ErrorTableRow: React.FC<ErrorTableRowProps> = ({
rowData,
columns,
rowError,
}) => {
return (
<tr className={`border-b ${rowError ? "bg-red-100 text-red-700" : ""}`}>
{columns.map((col) => ( <td key={col.accessorKey} className="px-2 py-1 border">
{rowData[col.accessorKey]} </td>
))}


  {rowError && (
    <td className="px-2 py-1 border">
      <Tooltip text={rowError}>
        <span className="text-red-700 cursor-help">⚠️</span>
      </Tooltip>
    </td>
  )}
</tr>


);
};

export default ErrorTableRow;
