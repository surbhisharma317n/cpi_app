import React, { useState, useEffect } from "react";
import { FaDownload } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchCapiData } from "../../features/capi/capiSlice";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../components/data_table/datatable1";

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

const RefPrices: React.FC = () => {
  const dispatch = useAppDispatch();
  const { capiData, loading, error } = useAppSelector((state) => state.capi);

  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [monthYear] = useState<string>("Dec_2024");

  // fetch initial data
  useEffect(() => {
    dispatch(
      fetchCapiData({
        tab: activeTab.toLowerCase(),
        month_year: monthYear,
        iter: 1,
      })
    );
  }, [activeTab, monthYear, dispatch]);

  const exportToCSV = (data: any[], fileName: string) => {
    if (!data.length) return;

    const csvRows = [
      Object.keys(data[0]),
      ...data.map((row) => Object.values(row)),
    ];
    const csvContent = csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
  };

  const handleTabData = (tab: string) => {
    setActiveTab(tab);
    dispatch(
      fetchCapiData({
        tab: tab.toLowerCase(),
        month_year: monthYear,
        iter: 1,
      })
    );
  };

  const columns: ColumnDef<any>[] = capiData?.length
    ? Object.keys(capiData[0]).map((key) => ({
        accessorKey: key,
        header: key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      }))
    : [];

  return (
    <div className="mx-auto">
      <div className="p-3 rounded-xl shadow-lg">
        <h4 className="text-xl font-bold mb-5 flex items-center">
          Price Ref Year 2024
        </h4>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full overflow-x-auto">
            <ul className="flex space-x-1 min-w-max pb-1">
              {tabs.map((tab) => (
                <li
                  key={tab}
                  onClick={() => handleTabData(tab)}
                  className={`cursor-pointer px-4 py-2 rounded-t-lg capitalize transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-gradient-to-b from-blue-900 to-blue-800 text-white font-semibold shadow-md"
                      : "border-b-2 border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  {tab.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </div>

          {capiData?.length > 0 && (
            <button
              onClick={() => exportToCSV(capiData, `${activeTab}_Data`)}
              className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg shadow-md text-sm font-medium"
            >
              <FaDownload className="text-sm" />
              <span>Export {activeTab.replace(/_/g, " ")}</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto p-4">
          {loading && <p>Loading data...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}

          {!loading && !error && capiData?.length > 0 && (
            <DataTable
              columns={columns}
              data={capiData}
              title={activeTab.replace(/_/g, " ")}
              action={{ edit: true, delete: true }}
            />
          )}

          {!loading && capiData?.length === 0 && (
            <p className="text-gray-500">No data found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefPrices;
