import React from "react";
import type { InflationReport, TabContentProps } from "../../../types";
// interface TabContentProps {
//   activeTab: string;
//   isLoading: boolean;
//   tableData: InflationReport[] | null;
//   error: string | null;
// }

const renderReportRow = (report: InflationReport) => {
  // Common fields
  const commonFields = (
    <>
      <td className="px-6 py-4 whitespace-nowrap">
        {report.month} {report.year}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {report.indexValue.toFixed(1)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            report.monthlyChange >= 0
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {report.monthlyChange >= 0 ? "↑" : "↓"}{" "}
          {Math.abs(report.monthlyChange)}%
        </span>
      </td>
    </>
  );

  // Type-specific fields
  const specificFields =
    "category" in report ? (
      <>
        <td className="px-6 py-4 whitespace-nowrap">{report.category}</td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              report.yearlyChange >= 0
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {report.yearlyChange >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(report.yearlyChange)}%
          </span>
        </td>
      </>
    ) : (
      <td className="px-6 py-4 whitespace-nowrap">{report.state}</td>
    );

  return (
    <tr key={report.id} className="hover:bg-gray-50">
      {commonFields}
      {specificFields}
    </tr>
  );
};

const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  isLoading,
  tableData,
  error,
}) => {
  const getHeaders = () => {
    switch (activeTab) {
      case "tab1": // Weighted
        return [
          "Period",
          "Index Value",
          "Monthly Change",
          "Category",
          "Yearly Change",
        ];
      case "tab2": // State
        return ["Period", "Index Value", "Monthly Change", "State"];

      default:
        return ["Period", "Index Value", "Monthly Change"];
    }
  };

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : tableData ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                {getHeaders().map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.map(renderReportRow)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Submit the form to generate reports
          </p>
        </div>
      )}
    </div>
  );
};

export default TabContent;
