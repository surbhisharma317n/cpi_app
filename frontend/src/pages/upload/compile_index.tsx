import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchAllIndiaLevlIndexItem } from "../../features/output_data/allIndiaLevelSlice";
import { exportAllIndiaLevelIndex } from "../../features/output_data/exportAllIndiaIndexSlice";
import dropDownField from "../../components/ui/Form/dropdownField";
import SelectFilter from "../../components/ui/Form/SelectFilter";
import { DynamicDataTable } from "../../components/data_table/dynamic_datatable";
import ExportButton from "../../components/Form/ExportButton";


import type { ColumnDef } from "@tanstack/react-table";
import * as XLSX from "xlsx";

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

const getDefaultDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return { month: d.toLocaleString("en-US", { month: "short" }), year: d.getFullYear() };
};

const Compile_Index: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector((state) => state.allIndiaLevelIndex);

  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const [subTab, setSubTab] = useState(tabs[0].subtabs[0].value);
  const [dataType, setDataType] = useState({ ...getDefaultDate(), compile_type: "Provisional" });

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch data whenever tab/subtab/date/pagination changes
  const fetchData = useCallback(() => {
    dispatch(
      fetchAllIndiaLevlIndexItem({
        tab: activeTab,
        subTab,
        dataType,
        page: currentPage,
        pageSize,
      })
    ).then((res: any) => {
      const { total_pages } = res.payload || {};
      setTotalPages(total_pages || 1);
    });
  }, [activeTab, subTab, dataType, currentPage, pageSize, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepare table data
  const tableData = useMemo(() => {
    if (!baseData) return [];
    return Array.isArray(baseData) ? baseData[0]?.data ?? [] : (baseData as any)?.data ?? [];
  }, [baseData]);

  // Dynamic columns
  const dynamicColumns = useMemo<ColumnDef<any>[]>(() => {
    if (!tableData.length) return [];

    const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const row = tableData[0];

    return Object.keys(row).map((col) => {
      if (col === "index" && Array.isArray(row[col])) {
        return {
          header: "Index",
          columns: row[col].map((obj: any) => {
            const key = Object.keys(obj)[0];
            return { header: titleCase(key), accessorFn: (r: any) => r.index?.find((x: any) => Object.keys(x)[0] === key)?.[key] ?? "" };
          }),
        };
      }
      return { accessorKey: col, header: titleCase(col) };
    });
  }, [tableData]);

  const flattenIndex = useCallback((data: any[]) => {
    return data.map((row) => {
      const flat: any = {};
      Object.entries(row).forEach(([k, v]: any) => {
        if (k === "index" && Array.isArray(v)) {
          v.forEach((i: any) => {
            const key = Object.keys(i)[0];
            flat[`Index - ${key}`] = i[key] ?? "";
          });
        } else flat[k] = v;
      });
      return flat;
    });
  }, []);

  // Export all tabs
  const exportAllTabs = async () => {
    const wb = XLSX.utils.book_new();
    for (const tab of tabs) {
      for (const st of tab.subtabs) {
        const res = await dispatch(exportAllIndiaLevelIndex({ tab: tab.value, subTab: st.value, dataType })).unwrap();
        const data = res?.data ?? [];
        if (data.length) {
          const ws = XLSX.utils.json_to_sheet(flattenIndex(data));
          XLSX.utils.book_append_sheet(wb, ws, `${tab.label}_${st.label}`.substring(0, 31));
        }
      }
    }
    XLSX.writeFile(wb, `All_India_Index_${dataType.month}_${dataType.year}.xlsx`);
  };

const fetchAllData = async ({ }: any) => {
  const limit = 50;

  // 🔥 STEP 1: Get first page (to know total_pages)
  const firstRes: any = await dispatch(
    fetchAllIndiaLevlIndexItem({
      tab: activeTab,
      subTab,
      dataType,
      page: 1,
      pageSize: limit,
    })
  ).unwrap();

  const totalPages = firstRes?.total_pages || 1;

  console.log("TOTAL PAGES:", totalPages);

  // 🔥 STEP 2: Create all requests in parallel
  const requests = [];

  for (let page = 1; page <= totalPages; page++) {
    requests.push(
      dispatch(
        fetchAllIndiaLevlIndexItem({
          tab: activeTab,
          subTab,
          dataType,
          page,
          pageSize: limit,
        })
      ).unwrap()
    );
  }

  // 🔥 STEP 3: Run all API calls together
  const results = await Promise.all(requests);

  // 🔥 STEP 4: Merge all data
  const allRows = results.flatMap((res) => (res as any)?.data || []);

  console.log("TOTAL EXPORTED:", allRows.length);

  return flattenIndex(allRows);
};



  return (
    <div className="p-3 rounded-xl shadow-lg">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Released Index Outputs</h1>

      <SelectFilter fields={dropDownField} onFilter={setDataType} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <Tabs value={subTab} onValueChange={setSubTab}>
              <div className="flex justify-between mb-4">
                <TabsList>
                  {t.subtabs.map((st) => (
                    <TabsTrigger key={st.value} value={st.value}>{st.label}</TabsTrigger>
                  ))}
                </TabsList>

                <ExportButton onClick={exportAllTabs} label="Export All" />
              </div>

              {t.subtabs.map((st) => (
                <TabsContent key={st.value} value={st.value}>
                  {tableData.length ? (
                    <DynamicDataTable
                      data={tableData}
                      columns={dynamicColumns}
                      title={`${t.label} - ${st.label}`}
                      action={{ edit: false, delete: false }}
                      file_name={`${t.value}_${dataType.month}_${dataType.year}`}
                      serverPagination={{ currentPage, totalPages, pageSize, setCurrentPage, setPageSize, fetchData }}
                      fetchAllData={fetchAllData} // 🔥 ADD THIS
                    />
                  ) : loading ? (
                    <p>Loading...</p>
                  ) : error ? (
                    <p className="text-red-500">{error}</p>
                  ) : (
                    <p>No data found</p>
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