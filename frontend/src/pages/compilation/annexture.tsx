import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { DataTable } from "../../components/data_table/datatable1";
import { useAppDispatch, useAppSelector } from "../../app/store";
import type { ColumnDef } from "@tanstack/react-table";

import { fetchInputPriceItem } from "../../features/input_data/inputReportSlice";
import dropDownField from "../../components/ui/Form/dropdownField";
import SelectFilter from "../../components/ui/Form/SelectFilter";

/* ---------------- Tabs ---------------- */
const tabsList = [
  { label: "Rural Item Price", value: "rural_item_price" },
  { label: "Urban Item Price", value: "urban_item_price" },
  { label: "Rural House Rent", value: "rural_house_rent" },
  { label: "Urban House Rent", value: "urban_house_rent" },
  { label: "Rural Electricity", value: "rural_electricity" },
  { label: "Urban Electricity", value: "urban_electricity" },
  { label: "Online Shopping", value: "online_shopping" },
  { label: "Airfare", value: "airfare" },
  { label: "PDS Price", value: "pds_price" },
];

type DataType = {
  month: string;
  year: number;
  compile_type: string;
};

const AnnexureReport: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector(
    (state) => state.inputReport
  );

  /* ---------------- Default Date ---------------- */
  const now = new Date();
  now.setMonth(now.getMonth() - 1);

  /* ---------------- State ---------------- */
  const [activeTab, setActiveTab] = useState(tabsList[0].value);

  const [dataType, setDataType] = useState<DataType>({
    month: now.toLocaleString("en-US", { month: "short" }),
    year: now.getFullYear(),
    compile_type: "Provisional",
  });

  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState(15);

  /* ---------------- Reset Page ---------------- */
  useEffect(() => {
    setPage(1);
  }, [activeTab, dataType]);

  /* ---------------- API Fetch ---------------- */
  useEffect(() => {
    dispatch(
      fetchInputPriceItem({
        tab: activeTab,
        dataType,
        page,
        pageSize,
      })
    );
  }, [activeTab, dataType, page, pageSize, dispatch]);

  /* ---------------- Extract API Response Safely ---------------- */
  const apiData = useMemo(() => {
    if (!baseData) return { columns: [], rows: [], totalPages: 1 };

    const bd: any = baseData;

    const dataBlock = Array.isArray(bd) ? bd[0]?.data : bd?.data;

    return {
      columns: dataBlock?.columns || [],
      rows: dataBlock?.data || [],
      totalPages: dataBlock?.totalPages || 1, // ✅ dynamic
    };
  }, [baseData]);

  /* ---------------- Columns ---------------- */
  const columns = useMemo<ColumnDef<any>[]>(() => {
    return apiData.columns.map((key: string) => ({
      accessorKey: key,
      header: key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase()),
    }));
  }, [apiData.columns]);

  /* ---------------- Filter ---------------- */
  const handleFilter = useCallback((filters: DataType) => {
    setDataType(filters);
  }, []);

  /* ---------------- UI ---------------- */
  return (
    <div className="p-3 rounded-xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-3">Annexure</h1>

      <SelectFilter fields={dropDownField} onFilter={handleFilter} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabsList.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabsList.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <DataTable
                data={apiData.rows}
                columns={columns}
                title={t.label}
                action={{ edit: false, delete: false }}
                file_name={`${t.value}_${dataType.month}_${dataType.year}_input_price_data`}
                
                
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AnnexureReport;