import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../app/store";
import type { ColumnDef } from "@tanstack/react-table";
import { DynamicDataTable } from "../../components/data_table/dynamic_datatable";
import { fetchMasterWeightedItem } from "../../features/master_data/weightsSlice";
import ExportButton from "../../components/Form/ExportButton";

/* ---------------- Tabs ---------------- */
const tabs = [
  {
    label: "Coicop",
    value: "coicop",
    subtabs: [
      // { label: "PDS Weighted Item Expenditure Shares", value: "pds_pitem_exp_shares" },
      //{ label: "Priced Item Expenditure Shares", value: "priced_item_expenditure_shares" },
      { label: "Priced Item Expenditure Shares", value: "vw_priced_item_expenditure_shares" },
      // { label: "Priced Item Weights", value: "priced_item_weights" },
      { label: "Weighted Item Expenditure Shares", value: "vw_weighted_item_expenditure_shares" },
    ],
  },
  { label: "PDS", value: "pds", subtabs: [{ label: "PDS Weighted Item Expenditure Shares", value: "vw_pds_pitem_exp_shares" }] },
  { label: "Electricity", value: "electricity", subtabs: [{ label: "Discom Slab Weights", value: "vw_discom_slab_weights" }] },
  { label: "House Rent", value: "hr", subtabs: [
    { label: "HR Category Weights", value: "vw_hr_category_weights" },
    { label: "HR Own Rent Exp Share", value: "vw_hr_own_rent_exp_shares" },
  ] },
  { label: "Railfare Weights", value: "railfare_wts", subtabs: [{ label: "Railfare Weights", value: "vw_railfare_wts" }] },
  { label: "Telecom", value: "telecom_op_wts", subtabs: [{ label: "Telecom Op Weights", value: "vw_telecom_op_wts" }] },
];

const MasterWeights: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector((state) => state.itemsWeightsDetails);

  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const [subTab, setSubTab] = useState(tabs[0].subtabs[0].value);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  const currentTab = useMemo(() => tabs.find((t) => t.value === activeTab), [activeTab]);

  // Reset subtab when tab changes
  useEffect(() => {
    const tab = tabs.find((t) => t.value === activeTab);
    if (tab?.subtabs?.length) {
      setSubTab(tab.subtabs[0].value);
      setCurrentPage(1);
    }
  }, [activeTab]);

  // Fetch page data
  const fetchData = useCallback(() => {
    dispatch(
      fetchMasterWeightedItem({
        tab: activeTab,
        subTab,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      })
    ).then((res: any) => setTotalPages(res?.payload?.total_pages || 1));
  }, [activeTab, subTab, currentPage, pageSize, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tableData = useMemo(() => baseData?.data ?? [], [baseData]);

  // Flatten nested 'index' column
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

  // ------------------- EXPORT ALL DATA -------------------
  const fetchAllData = async () => {
  const batchSize = 2000; // rows per request (adjust for performance)
  
  // 1️⃣ Fetch first batch to get total_records
  const firstRes: any = await dispatch(
    fetchMasterWeightedItem({
      tab: activeTab,
      subTab,
      limit: batchSize,
      offset: 0,
    })
  ).unwrap();

  const totalRecords = firstRes?.total_records || 0;
  const totalPages = Math.ceil(totalRecords / batchSize);
  let allRows: any[] = [...(firstRes?.data || [])];

  // 2️⃣ Prepare remaining requests in parallel
  const requests: Promise<any>[] = [];
  for (let page = 1; page < totalPages; page++) {
    const offset = page * batchSize;
    requests.push(
      dispatch(
        fetchMasterWeightedItem({
          tab: activeTab,
          subTab,
          limit: batchSize,
          offset,
        })
      ).unwrap()
    );
  }

  // 3️⃣ Execute all remaining requests together
  const results = await Promise.all(requests);

  // 4️⃣ Merge all data
  results.forEach((res) => {
    if (res?.data?.length) allRows.push(...res.data);
  });

  console.log("TOTAL EXPORTED ROWS:", allRows.length);

  // 5️⃣ Flatten 'index' column if needed
  return flattenIndex(allRows);
};

  // ------------------- DYNAMIC TABLE COLUMNS -------------------
  const dynamicColumns = useMemo<ColumnDef<any>[]>(() => {
    if (!tableData.length) return [];
    const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const firstRow = tableData[0];

    return Object.keys(firstRow).map((key) => {
      if (key === "index" && Array.isArray(firstRow[key])) {
        return {
          header: "Index",
          columns: firstRow[key].map((obj: any) => {
            const sector = Object.keys(obj)[0];
            return {
              header: titleCase(sector),
              accessorFn: (row: any) =>
                row.index?.find((x: any) => Object.keys(x)[0] === sector)?.[sector] ?? "",
            };
          }),
        };
      }
      return { accessorKey: key, header: titleCase(key) };
    });
  }, [tableData]);

  return (
    <div className="p-3 rounded-xl shadow-lg">
      <div className="mb-6 flex items-center justify-between bg-white rounded-2xl border px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">CPI Item Weights</h1>
      </div>

      {/* Tabs */}
      <div className="flex my-6 gap-4">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 rounded-lg ${activeTab === t.value ? "bg-[#0f4c81] text-white" : "bg-white text-[#3193E7] border-b-2 border-[#3193E7]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Subtabs + Export */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-3">
          {currentTab?.subtabs.map((st) => (
            <button
              key={st.value}
              onClick={() => { setSubTab(st.value); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm ${subTab === st.value ? "bg-[#0f4c81] text-white" : "bg-white text-[#3193E7] border-b-2 border-[#3193E7]"}`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <ExportButton onClick={fetchAllData} />
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <DynamicDataTable
          data={tableData}
          columns={dynamicColumns}
          title={`${currentTab?.label} - ${subTab}`}
          file_name={`${activeTab}_${subTab}`}
          action={{ edit: false, delete: false }}
          serverPagination={{ currentPage, totalPages, pageSize, setCurrentPage, setPageSize, fetchData }}
          fetchAllData={fetchAllData}
        />
      )}
    </div>
  );
};

export default MasterWeights;