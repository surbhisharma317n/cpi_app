import React, { useState, useEffect, useMemo } from "react";

import AddData from "../../components/model/AddData";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchJurisdiction } from "../../features/base_item/baseSlice";
import type { ColumnField } from "../../components/model/AddRowModal";
import { DataTable } from "../../components/data_table/datatable1";




const RefWeights: React.FC = () => {
  const [columns, setColumns] = useState<ColumnField[]>([]);

  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector((state) => state.base);
  const normalizedData: any[] = Array.isArray(baseData)
    ? baseData
    : (baseData as any)?.data ?? [];

  // Fetch default data on mount
  useEffect(() => {
    dispatch(fetchJurisdiction({ tab: "state" })); // or any default dataset you want
  }, [dispatch]);

  // Dynamically create columns from API response
  const dynamicColumns = useMemo(() => {
    // If baseData is an array (normalizedData) we don't have a .data property to read columns from
    const dataObj = Array.isArray(baseData) ? undefined : (baseData as any)?.data;
    if (!dataObj?.columns || !Array.isArray(dataObj.columns)) return [];

    const cols: ColumnField[] = dataObj.columns.map((col: string) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      inputType: "text", // default input type for Add Row modal
    }));

    setColumns(cols);
    return cols;
  }, [baseData]);

  // Add Row callback
  const handleAddRow = (row: Record<string, any>) => {
    console.log("New Row:", row);
    // Call backend API to insert row
  };

  // Bulk Upload error callback
  const handleBulkUploadErrors = (errors: any[]) => {
    console.log("Bulk Upload Errors:", errors);
  };

  return (
    <div className=" p-3 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Weights Data</h1>
        <AddData columns={columns} onAddRow={handleAddRow} onBulkUploadErrors={handleBulkUploadErrors} />
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <DataTable
              data={normalizedData}
              columns={dynamicColumns}
              title="Weights Data" action={{
                edit: true,
                delete: true
              }}        />
      )}
    </div>
  );
};

export default RefWeights;
