// 


import React from "react";
// import { FileText, FileSpreadsheet, FileSignature } from "lucide-react";
import { FileText, FileSpreadsheet } from "lucide-react";

interface ExportButtonsProps {
  handleExport: (format: "csv" | "excel" | "pdf") => void;
}
const baseStyle =
  "flex items-center gap-2 text-white px-4 py-1 rounded transition-all duration-200 transform hover:scale-105 active:scale-95";

const ExportButtons: React.FC<ExportButtonsProps> = ({ handleExport }) => {
  return (
    <div className="flex gap-2">
      
      {/* CSV - Green */}
      <button
        onClick={() => handleExport("csv")}
        className={`${baseStyle} bg-[#da6c78] hover:bg-[#d03d58]`}
      >
        <FileText className="w-4 h-4" />
        Export CSV
      </button>

      {/* Excel - Emerald */}
      <button
        onClick={() => handleExport("excel")}
        className={`${baseStyle} bg-[#f9a543] hover:bg-[#f79a1b]`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export Excel
      </button>

      {/* PDF - Red */}
      {/* <button
        onClick={() => handleExport("pdf")}
        className={`${baseStyle} bg-[#3697aa] hover:bg-[#008ca1]`}>
        <FileSignature className="w-4 h-4" />
        Export PDF
      </button> */}

    </div>
  );
};
export default ExportButtons;