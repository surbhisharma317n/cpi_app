import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaDownload } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchCapiData } from "../features/capi/capiSlice";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../components/data_table/datatable1";


const tabs = [
  "rural_electricity",
  "urban_electricity",
  "rural_housing_rent",
  "urban_housing_rent",
  "rural_item_price",
  "urban_item_price",
  "urban_online",
  "urban_pds_price",
];

const ExploreDataPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { capiData, loading, error } = useAppSelector((state) => state.capi);

  /** ------------------------------------------
   * Normalize API Data
   ------------------------------------------ */
  const normalizedData: any[] = useMemo(() => {
    if (Array.isArray(capiData)) return capiData;
    return (capiData as any)?.data ?? [];
  }, [capiData]);

  /** ------------------------------------------
   * State
   ------------------------------------------ */
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [monthYear] = useState<string>("Dec_2024"); // static based on your original code
  const [showForm, setShowForm] = useState(false);

  /** ------------------------------------------
   * Fetch API on initial load or tab change
   ------------------------------------------ */
  useEffect(() => {
    dispatch(
      fetchCapiData({
        tab: activeTab.toLowerCase(),
        month_year: monthYear,
        iter: 1,
      })
    );
    setShowForm(true);
  }, [activeTab, monthYear, dispatch]);

  /** ------------------------------------------
   * CSV Export
   ------------------------------------------ */
  const exportToCSV = useCallback((data: any[], fileName: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => row[h]));

    const csvContent = [headers, ...rows]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
  }, []);

  /** ------------------------------------------
   * Dynamic Columns
   ------------------------------------------ */
  const columns: ColumnDef<any>[] = useMemo(() => {
    if (!normalizedData?.length) return [];

    return Object.keys(normalizedData[0]).map((key) => ({
      accessorKey: key,
      header: key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [normalizedData]);

  /** ------------------------------------------
   * Tab Click
   ------------------------------------------ */
  const handleTabClick = useCallback(
    (tab: string) => {
      setActiveTab(tab);
    },
    []
  );

  /** ------------------------------------------
   * UI Render
   ------------------------------------------ */
  return (
    <div className="mx-auto">
      <div className="bg-white p-3 rounded-xl shadow-md">
        <h4 className="text-xl font-bold text-gray-800 mb-5">
          Price Ref Year 2024
        </h4>

        {/* Tabs */}
        {showForm && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

              {/* TAB LIST */}
              <div className="w-full overflow-x-auto">
                <ul className="flex space-x-1 min-w-max pb-1">
                  {tabs.map((tab) => (
                    <li
                      key={tab}
                      onClick={() => handleTabClick(tab)}
                      className={`cursor-pointer px-4 py-2 rounded-t-lg capitalize transition-all duration-150 whitespace-nowrap ${
                        activeTab === tab
                          ? "bg-blue-600 text-white font-semibold shadow"
                          : "bg-white text-gray-700 border-b-2 border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {tab.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>

              {/* EXPORT BUTTON */}
              {normalizedData.length > 0 && (
                <button
                  onClick={() =>
                    exportToCSV(normalizedData, `${activeTab}_Data`)
                  }
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all text-sm"
                >
                  <FaDownload />
                  Export {activeTab.replace(/_/g, " ")}
                </button>
              )}
            </div>

            {/* DATA TABLE */}
            <div className="overflow-x-auto p-4">
              {loading && <p>Loading data...</p>}
              {error && <p className="text-red-600">Error: {error}</p>}

              {!loading && !error && normalizedData.length > 0 && (
                <DataTable
                  title={activeTab.replace(/_/g, " ")}
                  columns={columns}
                  data={normalizedData} action={{
                    edit: false,
                    delete: false
                  }}                />
              )}

              {!loading && normalizedData.length === 0 && (
                <p className="text-gray-500">No data found.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExploreDataPage;
