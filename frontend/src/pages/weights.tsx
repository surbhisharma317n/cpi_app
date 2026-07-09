import React, { useState } from "react";

interface WeightRow {
  id: number;
  State_Code: number | string;
  State_Name: string;
  Sector_Code: number;
  Sector_Name: string;
  Item_code: number;
  Item_Name: string;
  Item_Code_Full: string;
  Group: number;
  SubGroup: string;
  Section: string;
  Group_Name: string;
  SubGroup_Name: string;
  Section_Name: string;
  weights: number;
  [key: string]: string | number;
}

const columns: (keyof WeightRow)[] = [
  "State_Code",
  "State_Name",
  "Sector_Code",
  "Sector_Name",
  "Item_code",
  "Item_Name",
  "Item_Code_Full",
  "Group",
  "SubGroup",
  "Section",
  "Group_Name",
  "SubGroup_Name",
  "Section_Name",
  "weights",
];

const rowsPerPage = 10;

const WeightsTable: React.FC = () => {
  const [editedData, setEditedData] = useState<WeightRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);

  const filteredData = editedData.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleCellChange = (
    id: number,
    key: keyof WeightRow,
    value: string | number
  ) => {
    setEditedData((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [key]: key === "weights" ? Number(value) : value }
          : row
      )
    );
  };

  const handleBulkUpdate = (key: keyof WeightRow, value: string | number) => {
    setEditedData((prev) =>
      prev.map((row) => ({
        ...row,
        [key]: key === "weights" ? Number(value) : value,
      }))
    );
  };

  const saveChanges = () => {
    setEditingId(null);
    setBulkEditMode(false);
  };

  const handleFileUpload = () => {};

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-6">HR Weights</h2>

      <div className="bg-white p-6 rounded shadow-md">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center">
          <div className="flex gap-2">
            <label className="bg-blue-800 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700 transition">
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              className="bg-purple-800 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
              onClick={() => setBulkEditMode((b) => !b)}
            >
              {bulkEditMode ? "Cancel Bulk Edit" : "Bulk Edit"}
            </button>
          </div>

          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Bulk edit section */}
        {bulkEditMode && (
          <div className="mb-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Bulk Update</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {columns.map((col) => (
                <div key={col}>
                  <label className="block text-sm font-medium mb-1">
                    {col}
                  </label>
                  <input
                    type={col === "weights" ? "number" : "text"}
                    placeholder={`Enter ${col}`}
                    onChange={(e) => handleBulkUpdate(col, e.target.value)}
                    className="border p-2 w-full rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                {columns.map((col) => (
                  <th key={col} className="border px-4 py-2">
                    {String(col).replace("_", " ")}
                  </th>
                ))}
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.map((row) => (
                <tr key={row.id} className="text-xs hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col} className="border px-2 py-1">
                      {editingId === row.id || bulkEditMode ? (
                        <input
                          type={col === "weights" ? "number" : "text"}
                          value={row[col] ?? ""}
                          onChange={(e) =>
                            handleCellChange(row.id, col, e.target.value)
                          }
                          className="border p-1 w-full focus:ring-2 focus:ring-blue-400"
                        />
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}

                  <td className="border px-2 py-1 text-center space-x-1">
                    <button
                      className="bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-800 transition text-xs"
                      onClick={() =>
                        setEditingId((prev) => (prev === row.id ? null : row.id))
                      }
                    >
                      {editingId === row.id ? "Cancel" : "Edit"}
                    </button>

                    {editingId === row.id && (
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition text-xs"
                        onClick={saveChanges}
                      >
                        Save
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap justify-end mt-4 gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
              )
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {arr[idx - 1] && page - arr[idx - 1] > 1 && (
                    <span className="px-2 py-1">...</span>
                  )}

                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    } transition`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition"
            >
              Next
            </button>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-6 flex gap-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            onClick={saveChanges}
            disabled={!bulkEditMode && editingId === null}
          >
            Save All Changes
          </button>

          <button
            className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition"
            onClick={() => setShowConfirm(true)}
          >
            Final Submit
          </button>
        </div>

        {/* Final Submit Confirm */}
        {showConfirm && (
          <div className="mt-6 border p-4 bg-gray-100 w-fit rounded">
            <p className="mb-2 font-semibold">
              Are you sure you want to submit?
            </p>

            <div className="flex gap-4">
              <button
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                onClick={() => {
                  alert("Data submitted successfully!");
                  setShowConfirm(false);
                  setEditingId(null);
                  setBulkEditMode(false);
                }}
              >
                Confirm
              </button>

              <button
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightsTable;
