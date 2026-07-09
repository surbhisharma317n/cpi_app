"use client";

import React from "react";
import * as XLSX from "xlsx";
import { FiDownload } from "react-icons/fi";
import { Button } from "../../components/ui2/button";

interface ExportSampleButtonProps {
  data: Record<string, string[]>; // e.g. expectedHeaders
  fileName?: string;
  className?: string;
}

const ExportSampleButton: React.FC<ExportSampleButtonProps> = ({
  data,
  fileName = "sample_headers",
  
}) => {
  /** 🔹 Export as Excel (1 sheet per dataset) */
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();

    Object.entries(data).forEach(([sheetName, headers]) => {
      const sampleRows = [headers]; // only header row
      const worksheet = XLSX.utils.aoa_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 30)); // Excel sheet name limit
    });

    XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: "xlsx" });
  };

  /** 🔹 Export as CSV (one file per section) */
  const exportCSV = () => {
    Object.entries(data).forEach(([name, headers]) => {
      const csvContent = headers.join(",") + "\n";
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${name}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  };

  /** 🔹 Export as JSON (one object of arrays) */
  const exportJSON = () => {
    const jsonData = Object.entries(data).map(([key, headers]) => ({
      file: key,
      headers,
    }));

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 items-center justify-center py-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Download Example Formats
      </h3>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button
          onClick={exportExcel}
          className="bg-green-50 hover:bg-green-100 text-green-700 rounded-xl flex items-center gap-2 px-4 py-2"
        >
          <FiDownload /> Excel
        </Button>

        <Button
          onClick={exportCSV}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl flex items-center gap-2 px-4 py-2"
        >
          <FiDownload /> CSV
        </Button>

        <Button
          onClick={exportJSON}
          className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-xl flex items-center gap-2 px-4 py-2"
        >
          <FiDownload /> JSON
        </Button>
      </div>
    </div>
  );
};

export default ExportSampleButton;
