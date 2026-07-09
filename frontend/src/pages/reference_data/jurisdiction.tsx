import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

import AddData from "../../components/model/AddData";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchJurisdiction } from "../../features/base_item/baseSlice";

import { DataTable } from "../../components/data_table/datatable1";

const tabsList = [
  "state",
  "district",
  "subdistrict",
  "market",
  "town",
  "village",
];

const Jurisdiction: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabsList[0]);
  const [dataType] = useState("");

  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector((state) => state.base);

  // Fetch data whenever tab changes
  useEffect(() => {
    dispatch(fetchJurisdiction({ tab: activeTab }));
  }, [activeTab, dataType, dispatch]);

  // Dynamically generate columns from API response

  const tableData = useMemo(() => {
    if (!baseData) return [];
    const bd: any = baseData;
    if (Array.isArray(bd)) return bd[0]?.data?.data ?? [];
    return bd?.data?.data ?? [];
  }, [baseData]);
  const dynamicColumns = useMemo(() => {
    const bd: any = baseData;
    const colsSource = Array.isArray(bd)
      ? bd?.[0]?.data?.columns
      : bd?.data?.columns;

    if (!colsSource) return [];

    return colsSource.map((col: string) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [baseData]);
  // const dynamicColumns = useMemo(() => {
  //   if (!baseData?.data?.columns || !Array.isArray(baseData.data.columns)) return [];

  //   const cols = baseData.data.columns.map((col: string) => ({
  //     accessorKey: col,
  //     header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  //   }));

  //   setColumns(cols);
  //   return cols;
  // }, [baseData]);

  // Callback when adding a single row
  const handleAddRow = (row: Record<string, any>) => {
    console.log("New Row:", row);
    // TODO: Call backend API to insert the new row
  };

  // Callback when bulk upload has errors
  const handleBulkUploadErrors = (errors: any[]) => {
    console.log("Bulk Upload Errors:", errors);
  };

  return (
    <div className=" p-3 rounded-xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-4">Jurisdiction Data</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tabs List and Add Data Button */}
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            {tabsList.map((key) => (
              <TabsTrigger key={key} value={key}>
                {key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </TabsTrigger>
            ))}
          </TabsList>
          <AddData
            columns={dynamicColumns}
            onAddRow={handleAddRow}
            onBulkUploadErrors={handleBulkUploadErrors}
          />
        </div>

        {/* Tabs Content */}
        {tabsList.map((key) => (
          <TabsContent key={key} value={key}>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <DataTable
                data={tableData || []}
                columns={dynamicColumns}
                title={key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                action={{
                  edit: false,
                  delete: false,
                }}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Jurisdiction;
