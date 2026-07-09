import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { DataTable } from "../../components/data_table/datatable1";

import { useAppDispatch, useAppSelector } from "../../app/store";

import type { ColumnDef } from "@tanstack/react-table";

import dropDownField from "../../components/ui/Form/dropdownField";
import SelectFilter from "../../components/ui/Form/SelectFilter";
import { fetchFinalInputPriceItem } from "../../features/input_data/finalInputReportSlice";

const tabsList = [
  { label: "Rural Market Prices", value: "rural_item_price" },
  
  { label: "Rural House Rent", value: "rural_house_rent" },
  { label: "Rural Electricity", value: "rural_electricity" },
  { label: "Urban Market Prices", value: "urban_item_price" },
  { label: "Urban House Rent", value: "urban_house_rent" },
  
  { label: "Urban Electricity", value: "urban_electricity" },
  { label: "Urban Online Market Prices", value: "online_shopping" },
  { label: "Urban Airfare Prices", value: "airfare" },
  { label: "Urban PDS Price", value: "pds_price" },
];
const Finalized_Capi_Input: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabsList[0].value);
  const now = new Date();
  now.setMonth(now.getMonth() - 1);

  const defaultMonth = now.toLocaleString("en-US", { month: "short" });
  const defaultYear = now.getFullYear();

  const [dataType, setDataType] = useState({
    month: defaultMonth,
    year: defaultYear,
    compile_type: "Provisional",
  });

  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);

  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector(
    (state) => state.finalInputReport
  );
  console.log(baseData,"baseData====")
  const normalizedData: any[] = Array.isArray(baseData)
    ? baseData
    : ((baseData as any)?.data ?? []);

  useEffect(() => {
    console.log(
      "Dispatching fetchInputPriceItem with tab:",
      activeTab,
      "and dataType object check",
      dataType
    );
    dispatch(fetchFinalInputPriceItem({ tab: activeTab, dataType: dataType })); // pass dataType
  }, [activeTab, dataType]); // dispatch is stable, no need to include dispatch

  const dynamicColumns = useMemo(() => {
    const bd: any = baseData;
    const colsSource = Array.isArray(bd)
      ? bd?.[0]?.columns
      : bd?.columns;

    if (!colsSource) return [];

    return colsSource.map((col: string) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [baseData]);

  useEffect(() => {
    setColumns(dynamicColumns);
  }, [dynamicColumns]);

  const handleFilter = (filters: any) => {
    console.log("Selected Filters:", filters);
    setDataType(filters); // this will auto trigger useEffect + API call
  };

  return (
    <div className="p-3 rounded-xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-2">Final Price Data</h1>
      <SelectFilter fields={dropDownField} onFilter={handleFilter} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            {tabsList.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabsList.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <DataTable
                data={normalizedData}
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

export default Finalized_Capi_Input;
