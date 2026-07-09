import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { DataTable } from "../../components/data_table/datatable1";
import AddData from "../../components/model/AddData";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchBaseData } from "../../features/base_item/baseSlice";
import type { ColumnDef } from "@tanstack/react-table";

// Your custom type for AddData
type ColumnField = {
  accessorKey: string;
  header: string;
  inputType?: string;
};

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

const Items: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabsList[0]);

  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector((state) => state.base);

  // Fetch data when tab changes
  useEffect(() => {
    dispatch(fetchBaseData({ tab: activeTab }));
  }, [activeTab, dispatch]);
    // Extract table data safely
  const tableData = useMemo(() => {
    if (!baseData) return [];
    const bd: any = baseData;
    if (Array.isArray(bd)) return bd[0]?.data?.data ?? [];
    return bd?.data?.data ?? [];
  }, [baseData]);

  // Generate both ColumnDef (for DataTable) and ColumnField (for AddData)
  const { tableColumns, formColumns } = useMemo(() => {
    if (!tableData?.columns || !Array.isArray(tableData.columns)) {
      return { tableColumns: [], formColumns: [] };
    }

    const cols: string[] = tableData.columns;

    const tableCols: ColumnDef<any>[] = cols.map((col) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));

    const formCols: ColumnField[] = cols.map((col) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      inputType: "text", // you can make this dynamic later
    }));

    return { tableColumns: tableCols, formColumns: formCols };
  }, [baseData]);

  // Add row callback
  const handleAddRow = (row: Record<string, any>) => {
    console.log("New row added:", row);
    // TODO: call backend API to insert row
  };

  // Bulk upload error callback
  const handleBulkUploadErrors = (errors: any[]) => {
    console.log("Bulk upload errors:", errors);
  };



  return (
    <div className="p-3 rounded-xl shadow-lg">
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

          {/* ✅ Pass ColumnField[] to AddData */}
          <AddData
            columns={formColumns}
            onAddRow={handleAddRow}
            onBulkUploadErrors={handleBulkUploadErrors}
          />
        </div>

        {tabsList.map((key) => (
          <TabsContent key={key} value={key}>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              // ✅ Pass ColumnDef[] to DataTable
              <DataTable data={tableData} columns={tableColumns} title={key} action={{
                    edit: false,
                    delete: false
                  }} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Items;
