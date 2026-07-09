import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchAllIndiaLevlIndexItem } from "../../features/output_data/allIndiaLevelSlice";
import dropDownField from "../../components/ui/Form/dropdownField";
import SelectFilter from "../../components/ui/Form/SelectFilter";
import type { ColumnDef } from "@tanstack/react-table";
import { DynamicDataTable } from "../../components/data_table/dynamic_datatable";

// ---------------- Tabs + Nested Subtabs ----------------
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
  {
    label: "State Wise",
    value: "state_wise",
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

  // Default month/year (previous month)
  const now = new Date();
  now.setMonth(now.getMonth() - 1);

  const defaultMonth = now.toLocaleString("en-US", { month: "short" });
  const defaultYear = now.getFullYear();

  const [dataType, setDataType] = useState({
    month: defaultMonth,
    year: defaultYear,
    compile_type: "Provisional",
  });

  // Fetch API on tab, subTab, or filters change
  useEffect(() => {
    dispatch(
      fetchAllIndiaLevlIndexItem({
        tab: activeTab,
        subTab,
        dataType,
        page: 1,       // Reset to first page on filter change
        pageSize: 15,  // Default page size
      })
    );
  }, [activeTab, subTab, dataType, dispatch]);

  // ------------------------------------------------------
  // 🚀 FINAL DYNAMIC COLUMNS (fully supports nested indexes)
  // ------------------------------------------------------
  const dynamicColumns = useMemo<ColumnDef<any>[]>(() => {
    // baseData can be either an array (legacy) or an object with .data.data and .data.columns
    const row = Array.isArray(baseData)
      ? (baseData as any)[0]
      : (baseData as any)?.data?.data?.[0];
    const columns = Array.isArray(baseData)
      ? Object.keys((baseData as any)[0] || {})
      : (baseData as any)?.data?.columns;

    console.log("Row for Columns Extraction:", row);
    console.log("Columns for Extraction:", columns);

    if (!row || !columns || !Array.isArray(columns)) return [];

    const titleCase = (str: string) =>
      str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const result: ColumnDef<any>[] = [];

    columns.forEach((col: string) => {
      const value = row[col];

      // ------------------------------------------------------
      // 1️⃣ Special Case: index = [ {rural}, {urban}, {combined} ]
      // ------------------------------------------------------
      if (col === "index" && Array.isArray(value)) {
        const sectorColumns = value.map((item: any) => {
          const sectorName = Object.keys(item)[0]; // rural / urban / combined

          return {
            header: titleCase(sectorName),
            accessorFn: (row: any) => {
              const found = row.index?.find(
                (x: any) => Object.keys(x)[0] === sectorName
              );
              return found?.[sectorName] ?? "";
            },
          } as ColumnDef<any>;
        });

        result.push({
          header: "Index",
          columns: sectorColumns,
        });

        return;
      }

      // ------------------------------------------------------
      // 2️⃣ Normal primitive columns
      // ------------------------------------------------------
      result.push({
        accessorKey: col,
        header: titleCase(col),
      });
    });

    return result;
  }, [baseData]);

  console.log("Dynamic Columns:", dynamicColumns);

  // Extract table data
  const tableData = useMemo(() => {
    if (!baseData) return [];
    // If baseData is already an array (older shape), return it directly
    if (Array.isArray(baseData)) return baseData;
    // Otherwise try to read the nested data property
    return (baseData as any)?.data?.data || [];
  }, [baseData]);
  console.log("Table Data:", tableData);

  // Filters handler
  const handleFilter = (filters: any) => {
    setDataType(filters);
  };

  return (
    <div className="p-3 rounded-xl shadow-lg">
     
      <div className="mb-6">
  <h1 className="text-3xl font-bold tracking-tight">
    Released Index Outputs
  </h1>
  <p className="text-muted-foreground">
    View all compiled and released index datasets here.
  </p>
</div>

      <SelectFilter fields={dropDownField} onFilter={handleFilter} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Top-Level Tabs */}
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            {tabs.map(({ label, value }) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab Content */}
        {tabs.map(({ label, value, subtabs }) => (
          <TabsContent key={value} value={value}>
            <Tabs value={subTab} onValueChange={setSubTab}>
              {/* Subtabs */}
              <TabsList>
                {subtabs.map((st) => (
                  <TabsTrigger key={st.value} value={st.value}>
                    {st.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {subtabs.map((st) => (
                <TabsContent key={st.value} value={st.value}>
                  {loading ? (
                    <p>Loading...</p>
                  ) : error ? (
                    <p className="text-red-500">{error}</p>
                  ) : (
                    <DynamicDataTable
                      data={tableData}
                      columns={dynamicColumns}
                      title={`${label} - ${st.label}`}
                      action={{ edit: false, delete: false }}
                      file_name={`${label}_${st.label}_${dataType.month}_${dataType.year}`}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Compile_Index;
