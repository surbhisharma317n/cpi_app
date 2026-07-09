import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { DataTable } from "../../components/data_table/datatable1";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchAllIndexItem } from "../../features/output_data/allIndiaSlice";
import dropDownField from "../../components/ui/Form/dropdownField";
import SelectFilter from "../../components/ui/Form/SelectFilter";
import type { ColumnDef } from "@tanstack/react-table";

const tabs = [
  {
    label: "All India",
    value: "all_india",
    subtabs: [
      { label: "Rural", value: "rural" },
      { label: "Urban", value: "urban" },
      { label: "Combine", value: "combine" },
    ],
  },
  {
    label: "State Wise",
    value: "state_wise",
    subtabs: [
      { label: "Rural", value: "rural" },
      { label: "Urban", value: "urban" },
      { label: "Combine", value: "combine" },
    ],
  },
];

const Comp_indices: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const [subTab, setSubTab] = useState(tabs[0].subtabs[0].value);

  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const defaultMonth = now.toLocaleString("en-US", { month: "short" });
  const defaultYear = now.getFullYear();

  const [dataType, setDataType] = useState({
    month: defaultMonth,
    year: defaultYear,
    compile_type: "Provisional",
  });

  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector(
    (state) => state.allIndiaIndex
  );

  useEffect(() => {
    dispatch(
      fetchAllIndexItem({
        tab: activeTab,
        subTab,
        dataType,
      })
    );
  }, [activeTab, subTab, dataType]);

const tableData = useMemo(() => {
        if (!baseData) return [];
        const bd: any = baseData;
        if (Array.isArray(bd)) return bd[0]?.data?.data ?? [];
        return bd?.data?.data ?? [];
      }, [baseData]);

    // Extract columns efficiently
const dynamicColumns: ColumnDef<any>[] = useMemo(() => {
      const columns = tableData?.columns || baseData?.[0]?.data?.columns;
      if (!columns) return [];
  
      return columns.map((col: string) => ({
        accessorKey: col,
        header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      }));
    }, [baseData,tableData]);
  

  // ------------------------------------------------------
  // 🚀 FINAL DYNAMIC COLUMNS (fully supports nested indexes)
  // ------------------------------------------------------
  // const dynamicColumns = useMemo<ColumnDef<any>[]>(() => {
  //   const row =
  //     Array.isArray(baseData)
  //       ? baseData?.[0]?.data?.rows?.[0]
  //       : baseData?.data?.rows?.[0];

  //   if (!row) return [];

  //   const titleCase = (str: string) =>
  //     str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  //   const buildColumns = (obj: any) =>
  //     Object.keys(obj).map((key) => {
  //       const value = obj[key];
  //       const header = titleCase(key);

  //       // ----------------------------------------------------------------
  //       // 1️⃣ Special Case: index = [{ rural }, { urban }, { combined }]
  //       // ----------------------------------------------------------------
  //       if (key === "index" && Array.isArray(value) && value.length > 0) {
  //         const sectorNames = value.map((item: any) => Object.keys(item)[0]);

  //         return {
  //           header,
  //           columns: sectorNames.map((sector) => ({
  //             header: titleCase(sector),
  //             accessorFn: (row: { index: any[]; }) => {
  //               const found = row.index?.find(
  //                 (x: any) => Object.keys(x)[0] === sector
  //               );
  //               return found?.[sector] ?? "";
  //             },
  //           })),
  //         };
  //       }

  //       // ----------------------------------------------------------------
  //       // 2️⃣ Nested objects (rural:{}, urban:{}, combined:{})
  //       // ----------------------------------------------------------------
  //       if (typeof value === "object" && !Array.isArray(value)) {
  //         return {
  //           header,
  //           columns: Object.keys(value).map((subKey) => ({
  //             accessorKey: `${key}.${subKey}`,
  //             header: titleCase(subKey),
  //           })),
  //         };
  //       }

  //       // ----------------------------------------------------------------
  //       // 3️⃣ Normal primitive column
  //       // ----------------------------------------------------------------
  //       return {
  //         accessorKey: key,
  //         header,
  //       };
  //     });

  //   return buildColumns(row);
  // }, [baseData]);

  // set columns
  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);
  useEffect(() => {
    setColumns(dynamicColumns);
  }, [dynamicColumns]);

  const handleFilter = (filters: any) => setDataType(filters);

  return (
    <div className="p-3 rounded-xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-2">Generated Indexes</h1>

      <SelectFilter fields={dropDownField} onFilter={handleFilter} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            {tabs.map(({ label, value }) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map(({ label, value, subtabs }) => (
          <TabsContent key={value} value={value}>
            <Tabs value={subTab} onValueChange={setSubTab} >
              <TabsList>
                {subtabs.map(({ label: subLabel, value: subValue }) => (
                  <TabsTrigger key={subValue} value={subValue}>
                    {subLabel}
                  </TabsTrigger>
                ))}
              </TabsList>

              {subtabs.map(({ label: subLabel, value: subValue }) => (
                <TabsContent key={subValue} value={subValue}>
                  {loading ? (
                    <p>Loading...</p>
                  ) : error ? (
                    <p className="text-red-500">{error}</p>
                  ) : (
                    <DataTable
                      data={tableData || []}
                      columns={columns}
                      title={`${label} - ${subLabel}`}
                      action={{ edit: false, delete: false }}
                      file_name={`${label}_${subLabel}_${dataType.month}_${dataType.year}`}
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

export default Comp_indices;
