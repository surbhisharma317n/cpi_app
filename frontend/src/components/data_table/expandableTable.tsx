import { useState, useMemo } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "./exportsData";

type Subgroup = {
  subgroup: string;
  weight: number;
  index: number;
  children?: [];
};

type Group = {
  group: string;
  children: Subgroup[];
};

type StateRow = {
  state: string;
  children: Group[];
};

type Column = {
  key: string;
  label: string;
  width?: string;
};

type Props = {
  data: StateRow[];
  columns?: Column[];
};

const RecursiveRow = ({
  row,
  handleEdit,
  handleDelete,
  columns,
  parentKey = "",
}: {
  row: any;
  handleEdit: (row: any) => void;
  handleDelete: (row: any) => void;
  columns: Column[];
  parentKey?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = row.children?.length > 0;

  const toggle = () => hasChildren && setExpanded(!expanded);

  const getTotals = (r: any): { weight: number; index: number } => {
    if (!r.children || r.children.length === 0) {
      return {
        weight: Number(r.weight) || 0,
        index: Number(r.index) || 0,
      };
    }
    return r.children.reduce(
      (acc: { weight: number; index: number }, c: any) => {
        const childTotals = getTotals(c);
        return {
          weight: acc.weight + childTotals.weight,
          index: acc.index + childTotals.index,
        };
      },
      { weight: 0, index: 0 }
    );
  };

  const totals = getTotals(row);
  const indent = row.state ? 0 : row.group ? 20 : 40;

  return (
    <>
      <tr
        onClick={toggle}
        className={`hover:bg-blue-50 transition cursor-pointer ${
          row.state
            ? "font-bold bg-blue-100"
            : row.group
            ? "font-semibold bg-blue-50"
            : "text-gray-800"
        }`}
      >
        {columns.map((col) => {
          if (col.key === "name") {
            return (
              <td
                key={col.key}
                className="border px-4 py-2"
                style={{ paddingLeft: `${indent}px`, width: col.width }}
              >
                {hasChildren && (
                  <span className="mr-2">
                    {expanded ? <Minus size={14} /> : <Plus size={14} />}
                  </span>
                )}
                {row.state
                  ? `State ${row.state}`
                  : row.group
                  ? `Group ${row.group}`
                  : `Subgroup ${row.subgroup}`}
              </td>
            );
          } else if (col.key === "weight") {
            return (
              <td key={col.key} className="border px-4 py-2" style={{ width: col.width }}>
                {totals.weight.toFixed(3)}
              </td>
            );
          } else if (col.key === "index") {
            return (
              <td key={col.key} className="border px-4 py-2" style={{ width: col.width }}>
                {totals.index.toFixed(3)}
              </td>
            );
          } else {
            return (
              <td key={col.key} className="border px-4 py-2" style={{ width: col.width }}>
                {row[col.key] ?? "-"}
              </td>
            );
          }
        })}
      </tr>

      {expanded &&
        hasChildren &&
        row.children.map((child: any, idx: number) => (
          <RecursiveRow
            key={`${parentKey}-${child.state || child.group || child.subgroup}-${idx}`}
            row={child}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            columns={columns}
            parentKey={parentKey + "-" + (row.state || row.group || row.subgroup)}
          />
        ))}
    </>
  );
};

export const ExpandableDataTable = ({ data, columns=[] }: Props) => {
  const [search, setSearch] = useState("");

  const handleEdit = (row: any) => console.log("Edit:", row);
  const handleDelete = (row: any) => console.log("Delete:", row);

  const defaultColumns: Column[] = [
    { key: "name", label: "Name", width: "200px" },
    { key: "weight", label: "Weight", width: "120px" },
    { key: "index", label: "Index", width: "120px" },
  ];

  const allColumns = [
    ...defaultColumns.filter((dc) => !columns.some((c) => c.key === dc.key)),
    ...columns,
  ];

  const filterData = (rows: any[]): any[] =>
    rows
      .map((row) => {
        const children = row.children ? filterData(row.children) : [];
        const match =
          row.state?.includes(search) ||
          row.group?.includes(search) ||
          row.subgroup?.includes(search);
        if (match || children.length > 0) return { ...row, children };
        return null;
      })
      .filter(Boolean);

  const filteredData = useMemo(() => (search ? filterData(data) : data), [search, data]);

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    const flatten = (rows: any[]): any[] =>
      rows.flatMap((r) => {
        const getTotals = (node: any): { weight: number; index: number } => {
          if (!node.children || node.children.length === 0)
            return { weight: node.weight ?? 0, index: node.index ?? 0 };
          return node.children.reduce(
            (acc: { weight: number; index: number }, c: any) => {
              const childTotals = getTotals(c);
              return {
                weight: acc.weight + childTotals.weight,
                index: acc.index + childTotals.index,
              };
            },
            { weight: 0, index: 0 }
          );
        };

        const totals = getTotals(r);
        const rowObj = {
          name: r.state || r.group || r.subgroup,
          weight: totals.weight,
          index: totals.index,
        };
        const childrenRows = r.children ? flatten(r.children) : [];
        return [rowObj, ...childrenRows];
      });

    const rowsToExport = flatten(filteredData);
    const colsKeys = allColumns.map((c) => c.key);
    const fileName = "jurisdiction_data";

    switch (format) {
      case "csv":
        exportToCSV(rowsToExport, colsKeys, fileName);
        break;
      case "excel":
        exportToExcel(rowsToExport, colsKeys, fileName);
        break;
      case "pdf":
        exportToPDF(rowsToExport, colsKeys, fileName);
        break;
    }
  };

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4 mb-2">
        <div>
          <button onClick={() => handleExport("csv")} className="px-3 py-1 bg-gray-700 text-white rounded mr-2">
            CSV
          </button>
          <button onClick={() => handleExport("excel")} className="px-3 py-1 bg-green-600 text-white rounded mr-2">
            Excel
          </button>
          <button onClick={() => handleExport("pdf")} className="px-3 py-1 bg-red-600 text-white rounded">
            PDF
          </button>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-250px)] border rounded-md">
        <table className="min-w-full table-fixed text-sm border-collapse">
          <thead className="bg-blue-900 text-white sticky top-0 z-10">
            <tr>
              {allColumns.map((col) => (
                <th key={col.key} className="border px-4 py-2" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <RecursiveRow key={row.state} row={row} handleEdit={handleEdit} handleDelete={handleDelete} columns={allColumns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
