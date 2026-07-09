import React, { useState } from "react";

import type { FilterFormValues } from "../types"; // Adjust the import path as necessary
import useInflationReports from "../hooks/useInflationReports";
import FilterForm from "../components/FilterForm/FilterForm";
import ReportTabs from "../components/ReportTabs/ReportTabs";
import ExportButton from "../components/Form/ExportButton";
import TabContent from "../components/Form/TabContent";

// Main component for Inflation Reports

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("tab1");
  const { fetchReports, isLoading, tableData, error } = useInflationReports();

  const handleFormSubmit = (data: FilterFormValues) => {
    fetchReports({
      ...data,
      reportType: activeTab,
    });
  };

  const handleExport = () => {
    // Export logic
    console.log("Exporting data...");
  };

  return (
    <div className="mx-auto">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h4 className="text-xl font-semibold text-gray-800 ">
          Compilation Reports
        </h4>

        <div className="bg-white rounded-lg shadow-sm p-4 ">
          <FilterForm onSubmit={handleFormSubmit} />
        </div>

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

          <div className="p-4">
            <TabContent
              activeTab={activeTab}
              isLoading={isLoading}
              tableData={tableData}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
