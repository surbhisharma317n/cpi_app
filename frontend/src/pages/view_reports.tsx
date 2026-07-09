import React, { useState, useCallback, useEffect } from "react";

import FilterForm from "../components/FilterForm/FilterForm";
import ReportTabs from "../components/ReportTabs/ReportTabs";
import ExportButton from "../components/Form/ExportButton";

import { useAppDispatch, useAppSelector } from "../app/store";
import { fetchCompileReports } from "../features/base_item/compileSlice";
import { ExpandableDataTable } from "../components/data_table/expandableTable";

const ViewReports: React.FC = () => {
const [activeTab, setActiveTab] = useState("tab1");
const [tableData, setTableData] = useState<any[]>([]);

const dispatch = useAppDispatch();
const { baseData } = useAppSelector((state) => state.compile);

/* Normalize incoming data */
const normalizedData: any[] = Array.isArray(baseData)
? baseData
: (baseData as any)?.data ?? [];

/* Handle form submit */
const handleFormSubmit = useCallback(() => {
dispatch(
fetchCompileReports({
month_year: "Feb_2024",
reportType: activeTab,
})
);
}, [dispatch, activeTab]);

/* Set table data once API responds */
useEffect(() => {
if (normalizedData && normalizedData.length > 0) {
setTableData(normalizedData);
} else {
setTableData([]);
}
}, [baseData]);

/* Convert fetched rows → columns needed by ExpandableDataTable */
const columns =
tableData.length > 0
? Object.keys(tableData[0]).map((key) => ({
key,
label: key
.replace(/_/g, " ")
.replace(/\b\w/g, (c) => c.toUpperCase()),
}))
: [];

const handleExport = () => {
console.log("Exporting data...");
};

return ( <div className="mx-auto"> <div className="bg-white rounded-lg shadow-md p-4"> <h4 className="text-xl font-semibold text-gray-800">
Compilation Reports </h4>

    {/* Filter Form */}
    <div className="bg-white rounded-lg shadow-sm p-4">
      <FilterForm onSubmit={handleFormSubmit} />
    </div>

    {/* Reports Section */}
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="w-full overflow-x-auto">
            <ReportTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-4">
            <ExportButton onClick={handleExport} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-4">
        <ExpandableDataTable
          data={tableData}
          columns={columns}
        />
      </div>
    </div>
  </div>
</div>


);
};

export default ViewReports;
