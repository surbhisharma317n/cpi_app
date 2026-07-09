import React, { useEffect, useMemo, useState } from "react";
import { DataTable } from "../../components/data_table/datatable1";
import { useAppDispatch, useAppSelector } from "../../app/store";
import type { ColumnDef } from "@tanstack/react-table";
import { fetchMarketItemDetails } from "../../features/master_data/marketSlice";

const MarketDetails: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector(
    (state) => state.marketDeatils
  );

  // -------------------------
  // DATE
  // -------------------------
  const now = new Date();
  now.setMonth(now.getMonth() - 1);

  const dataType = {
    month: now.toLocaleString("en-US", { month: "short" }),
    year: now.getFullYear(),
  };

  // -------------------------
  // STATE
  // -------------------------
  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // -------------------------
  // FETCH DATA (ONLY PAGINATION)
  // -------------------------
  const fetchData = () => {
    const limit = pageSize;
    const offset = (currentPage - 1) * pageSize;

    dispatch(
      fetchMarketItemDetails({
        limit,
        offset,
       
          
      })
    );
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize]);

  // -------------------------
  // COLUMNS
  // -------------------------
  const dynamicColumns = useMemo(() => {
    if (!baseData) return [];

    const bd: any = baseData;
    const cols = Array.isArray(bd) ? bd?.[0]?.columns : bd?.columns;

    if (!cols) return [];

    return cols.map((col: string) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").toUpperCase(),
    }));
  }, [baseData]);

  useEffect(() => {
    setColumns(dynamicColumns);
  }, [dynamicColumns]);

  // -------------------------
  // DATA
  // -------------------------
  const tableData = useMemo(() => {
    if (!baseData) return [];
    const bd: any = baseData;
    return Array.isArray(bd) ? bd[0]?.data ?? [] : bd?.data ?? [];
  }, [baseData]);

  const totalPages = useMemo(() => {
    if (!baseData) return 0;
    const bd: any = baseData;
    return Array.isArray(bd) ? bd?.[0]?.total_pages : bd?.total_pages;
  }, [baseData]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="p-3 rounded-xl shadow-lg">
      <div className="mb-6 flex items-center justify-between bg-white rounded-2xl border px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          Market Item Details
        </h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          title="Market Item Prices"
          action={{ edit: false, delete: false }}
          file_name={`market_${dataType.month}_${dataType.year}`}

          // ✅ ONLY SERVER PAGINATION
          serverPagination={{
            currentPage,
            totalPages,
            pageSize,
            setCurrentPage,
            setPageSize,
            fetchData,
          }}
        />
      )}
    </div>
  );
};

export default MarketDetails;