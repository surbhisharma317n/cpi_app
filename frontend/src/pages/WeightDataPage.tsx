import React, { useState } from "react";
import * as XLSX from "xlsx";

interface WeightRow {
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
}

const WeightDataPage: React.FC = () => {
  const [data, setData] = useState<WeightRow[]>([]);
  const [editedData, setEditedData] = useState<WeightRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const rowsPerPage = 10;
  console.log("data", data);  

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result as string;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);

      const mapped = json.map((row: any) => ({
        State_Code: row["State Code"],
        State_Name: row["State Name"],
        Sector_Code: row["Sector Code"],
        Sector_Name: row["Sector Name"],
        Item_code: row["Item_code"],
        Item_Name: row["Item_Name"],
        Item_Code_Full: row["Item Code"],
        Group: row["Group"],
        SubGroup: row["SubGroup"],
        Section: row["Section"],
        Group_Name: row["Group Name"],
        SubGroup_Name: row["SubGroup Name"],
        Section_Name: row["Section Name"],
        weights: row["weights"],
      }));
      setData(mapped);
      setEditedData(mapped);
      setCurrentPage(1);
    };

    reader.readAsBinaryString(file);
  };

  const filtered = editedData.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
  );
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  const handleChange = (
    index: number,
    key: keyof WeightRow,
    value: string | number
  ) => {
    const updated = [...editedData];
    const pageIndex = (currentPage - 1) * rowsPerPage + index;
    updated[pageIndex] = {
      ...updated[pageIndex],
      [key]: key === "State_Code" ? value : Number(value),
    };
    setEditedData(updated);
  };

  const handleSave = () => {
    setData(editedData);
    setEditRowIndex(null);
  };

  const handleFreeze = () => {
    setShowConfirm(true);
  };

  const confirmFreeze = (confirmed: boolean) => {
    if (confirmed) {
      alert("Final data has been submitted!");
      setEditRowIndex(null);
    }
    setShowConfirm(false);
  };

  const highlightMatch = (text: string | number, query: string) => {
    if (!query) return text;

    const str = String(text);
    const lowerStr = str.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (!lowerStr.includes(lowerQuery)) return str;

    const parts = str.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === lowerQuery ? (
            <mark key={i} className="bg-yellow-300 text-black px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="mx-auto">
      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl font-semibold mb-6">HR Weights</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center">
          <label className="bg-blue-800 text-white px-4 py-2 rounded cursor-pointer">
            Upload File
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="border px-4 py-2">State Code</th>
                <th className="border px-4 py-2">State Name</th>
                <th className="border px-4 py-2">Sector Code</th>
                <th className="border px-4 py-2">Sector Name</th>
                <th className="border px-4 py-2">Item Code</th>
                <th className="border px-4 py-2">Item Name</th>
                <th className="border px-4 py-2">Item Code (Full)</th>
                <th className="border px-4 py-2">Group</th>
                <th className="border px-4 py-2">SubGroup</th>
                <th className="border px-4 py-2">Section</th>
                <th className="border px-4 py-2">Group Name</th>
                <th className="border px-4 py-2">SubGroup Name</th>
                <th className="border px-4 py-2">Section Name</th>
                <th className="border px-4 py-2">Weights</th>
                <th className="border px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="text-xs">
                  {(
                    [
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
                    ] as (keyof WeightRow)[]
                  ).map((key) => (
                    <td key={key} className="border px-2 py-1">
                      {editRowIndex === i ? (
                        <input
                          type={key === "weights" ? "number" : "text"}
                          value={row[key] ?? ""}
                          onChange={(e) => handleChange(i, key, e.target.value)}
                          className="border p-1 w-full"
                        />
                      ) : (
                        highlightMatch(row[key], searchQuery)
                      )}
                    </td>
                  ))}
                  <td className="border px-2 py-1 text-center">
                    <button
                      className="bg-blue-700 text-white px-3 py-1 rounded"
                      onClick={() => setEditRowIndex(i)}
                    >
                      Edit
                    </button>
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
              className="px-3 py-1 border rounded bg-gray-100 disabled:opacity-50"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                return (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                );
              })
              .map((page, idx, arr) => {
                const prevPage = arr[idx - 1];
                const isEllipsisNeeded = prevPage && page - prevPage > 1;
                return (
                  <React.Fragment key={page}>
                    {isEllipsisNeeded && <span className="px-2 py-1">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={handleSave}
          >
            Save Changes
          </button>
          <button
            className="bg-blue-800 text-white px-4 py-2 rounded"
            onClick={handleFreeze}
          >
            Freeze Changes
          </button>
        </div>

        {/* Freeze Confirmation */}
        {showConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-sm text-center animate-fade-in">
              <h3 className="text-lg font-semibold mb-4">
                Are you sure for final submit?
              </h3>
              <div className="flex justify-center gap-4">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  onClick={() => confirmFreeze(true)}
                >
                  Yes
                </button>
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                  onClick={() => confirmFreeze(false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightDataPage;
