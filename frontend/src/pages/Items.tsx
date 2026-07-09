import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

import AddData from "../components/model/AddData";

import { useAppDispatch, useAppSelector } from "../app/store";
import { fetchBaseData } from "../features/base_item/baseSlice";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../components/data_table/datatable1";

/* ------------------------------------------------------
   TYPE DEFINITIONS (Fixes TypeScript Errors)
------------------------------------------------------ */
interface BaseDataResponse {
  columns?: string[];
  data?: any[] | { data?: any[]; columns?: string[] };
}

/* ------------------------------------------------------
   STATIC TAB LIST
------------------------------------------------------ */
const tabsList = [
  "groups",
  "subgroups",
  "category",
  "market",
  "section",
  "weighted_item",
  "gs",
  "price_item",
];

/* ------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------ */
const Items: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(tabsList[0]);

  const dispatch = useAppDispatch();

  const { baseData, loading, error } = useAppSelector(
    (state) => state.base as { baseData: BaseDataResponse | null; loading: boolean; error: string | null }
  );

  /* ------------------------------------------------------
     API CALL WHEN TAB CHANGES
  ------------------------------------------------------ */
  useEffect(() => {
    dispatch(fetchBaseData({ tab: activeTab }));
  }, [activeTab, dispatch]);

  /* ------------------------------------------------------
     BUILD DYNAMIC COLUMNS
  ------------------------------------------------------ */
  const dynamicColumns: ColumnDef<any>[] = useMemo(() => {
    if (!baseData || !baseData.data) return [];

    let columns: string[] = [];

    // Case 1 → API returns: { data: { columns: [] } }
    if (!Array.isArray(baseData.data)) {
      columns = baseData.data.columns ?? [];
    }

    // TS Guard
    if (!Array.isArray(columns)) return [];

    return columns.map((col: string) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [baseData]);

  /* ------------------------------------------------------
     NORMALIZE TABLE DATA
  ------------------------------------------------------ */
  const tableData = useMemo(() => {
    if (!baseData || !baseData.data) return [];

    // Case 1 → API returns: data: []
    if (Array.isArray(baseData.data)) {
      return baseData.data;
    }

    // Case 2 → API returns: data: { data: [] }
    if (Array.isArray(baseData.data.data)) {
      return baseData.data.data;
    }

    return [];
  }, [baseData]);

  /* ------------------------------------------------------
     RENDER
  ------------------------------------------------------ */
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-4">Items Data</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            {tabsList.map((key) => (
              <TabsTrigger key={key} value={key}>
                {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Add New Row Modal */}
          <AddData
            columns={dynamicColumns.map((c) => ({
              accessorKey: (c as any).accessorKey ?? (c as any).id ?? "",
              header:
                typeof (c as any).header === "string"
                  ? (c as any).header
                  : String((c as any).header ?? ""),
            }))}
            onAddRow={() => dispatch(fetchBaseData({ tab: activeTab }))} // auto refresh
          />
        </div>

        {/* Tab Contents */}
        {tabsList.map((key) => (
          <TabsContent key={key} value={key}>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <DataTable
                    data={tableData}
                    columns={dynamicColumns}
                    title={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} action={{
                      edit: true,
                      delete: true
                    }}              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Items;
