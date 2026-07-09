import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchAllIndiaLevlIndexItem } from "../../features/output_data/allIndiaLevelSlice";
import { exportAllIndiaLevelIndex } from "../../features/output_data/exportAllIndiaIndexSlice";

import dropDownField from "../../components/ui/Form/dropdownField";
import SelectFilter from "../../components/ui/Form/SelectFilter";
import type { ColumnDef } from "@tanstack/react-table";
import { DynamicDataTable } from "../../components/data_table/dynamic_datatable";
import ExportButton from "../../components/Form/ExportButton";

import * as XLSX from "xlsx";

/* ---------------- Tabs ---------------- */
const tabs = [
  {
    label: "All India",
    value: "all_india",
    subtabs: [
      { label: "General", value: "all" },
      { label: "Division", value: "division" },
      { label: "Group", value: "group" },
      { label: "Class", value: "class" },
      { label: "SubClass", value: "subclass" },
      { label: "WIndex", value: "witem" },
    ],
  },
];

const Compile_Index: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector(
    (state) => state.allIndiaLevelIndex
  );

  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const [subTab, setSubTab] = useState(tabs[0].subtabs[0].value);
  const [exportLoading, setExportLoading] = useState(false);

  /* ---------------- Pagination State ---------------- */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, _setPageSize] = useState(15);

  /* ---------------- Default Filters ---------------- */
  const now = new Date();
  now.setMonth(now.getMonth() - 1);

  const [dataType, setDataType] = useState({
    month: now.toLocaleString("en-US", { month: "short" }),
    year: now.getFullYear(),
    compile_type: "Provisional",
  });

  /* ---------------- Fetch API ---------------- */
  useEffect(() => {
    dispatch(
      fetchAllIndiaLevlIndexItem({
        tab: activeTab,
        subTab,
        dataType,
        page: currentPage,     // ✅ FIXED
        pageSize,              // ✅ FIXED
      } as any) // ⚠️ if slice type not updated
    );
  }, [activeTab, subTab, dataType, currentPage, pageSize, dispatch]);

  /* ---------------- Extract Table Data ---------------- */
  const tableData = useMemo(() => {
    if (!baseData) return [];

    const bd: any = baseData;

    if (Array.isArray(bd)) {
      return bd?.[0]?.data?.data ?? [];
    }

    return bd?.data?.data ?? [];
  }, [baseData]);

  /* ---------------- Dynamic Columns ---------------- */
  const dynamicColumns = useMemo<ColumnDef<any>[]>(() => {
    if (!tableData.length) return [];

    const row = tableData[0];

    const titleCase = (str: string) =>
      str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return Object.keys(row).map((col) => ({
      accessorKey: col,
      header: titleCase(col),
    }));
  }, [tableData]);

  /* ---------------- Filter Handler ---------------- */
  const handleFilter = (filters: any) => {
    setDataType(filters);
    setCurrentPage(1); // reset page
  };

  /* ---------------- Export ---------------- */
  const exportAllTabs = async () => {
    setExportLoading(true);

    try {
      const wb = XLSX.utils.book_new();

      for (const tab of tabs) {
        for (const st of tab.subtabs) {
          const response = await dispatch(
            exportAllIndiaLevelIndex({
              tab: tab.value,
              subTab: st.value,
              dataType,
            })
          ).unwrap();

          const data = (response as any)?.data ?? [];
          if (!data.length) continue;

          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(
            wb,
            ws,
            `${tab.label}_${st.label}`.substring(0, 31)
          );
        }
      }

      XLSX.writeFile(
        wb,
        `All_India_Index_${dataType.month}_${dataType.year}.xlsx`
      );
    } finally {
      setExportLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-3 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Released Index Outputs</h1>

      <SelectFilter fields={dropDownField} onFilter={handleFilter} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Tabs value={subTab} onValueChange={setSubTab}>
              <div className="flex justify-between mb-3">
                <TabsList>
                  {tab.subtabs.map((st) => (
                    <TabsTrigger key={st.value} value={st.value}>
                      {st.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <ExportButton
                  onClick={exportAllTabs}
                  label={exportLoading ? "Exporting..." : "Export All"}
                  disabled={exportLoading}
                  loading={exportLoading}
                />
              </div>

              {loading ? (
                <p>Loading...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <DynamicDataTable
                  data={tableData}
                  columns={dynamicColumns}
                  title={`${tab.label}`}
                  action={{ edit: false, delete: false }}
                  file_name={`${tab.label}_${dataType.month}_${dataType.year}`}
                  
                  // ✅ PASS PAGINATION
                  
                />
              )}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Compile_Index;