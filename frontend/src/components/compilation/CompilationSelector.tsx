import React from "react";
import { Label } from "../ui2/label";
import { Select } from "../ui2/select";
import { FiCalendar, FiType } from "react-icons/fi";

// 🔹 Types
export type CompileType = "PROVISIONAL" | "FINAL";

export interface CompilationParams {
  month: number;
  year: number;
  compile_type: CompileType | "";
}

interface Props {
  value: CompilationParams;
  onChange: (data: CompilationParams) => void;
  showMonthHelper?: boolean; // optional UX
}

// 🔹 Helper
const getMonthName = (month: number) => {
  const months = [
    "JAN","FEB","MAR","APR","MAY","JUN",
    "JUL","AUG","SEP","OCT","NOV","DEC",
  ];
  return months[month - 1] || "";
};

const CompilationSelector: React.FC<Props> = ({
  value,
  onChange,
  showMonthHelper = true,
}) => {
  const handleChange = (key: keyof CompilationParams, val: any) => {
    onChange({
      ...value,
      [key]: val,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Month */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FiCalendar className="h-4 w-4 text-indigo-500" />
          Month
        </Label>

        <Select
          value={value.month.toString()}
          onValueChange={(v) => handleChange("month", parseInt(v))}
          options={[
            { value: "1", label: "JAN" },
            { value: "2", label: "FEB" },
            { value: "3", label: "MAR" },
            { value: "4", label: "APR" },
            { value: "5", label: "MAY" },
            { value: "6", label: "JUN" },
            { value: "7", label: "JUL" },
            { value: "8", label: "AUG" },
            { value: "9", label: "SEP" },
            { value: "10", label: "OCT" },
            { value: "11", label: "NOV" },
            { value: "12", label: "DEC" },
          ]}
          placeholder="Select month"
        />

        {showMonthHelper && value.month && (
          <p className="text-xs text-gray-500 mt-1">
            Selected month: {value.month} ({getMonthName(value.month)})
          </p>
        )}
      </div>

      {/* Year */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FiCalendar className="h-4 w-4 text-indigo-500" />
          Year
        </Label>

        <Select
          value={value.year.toString()}
          onValueChange={(v) => handleChange("year", parseInt(v))}
          options={Array.from({ length: 5 }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return { value: year.toString(), label: year.toString() };
          })}
          placeholder="Select year"
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FiType className="h-4 w-4 text-indigo-500" />
          Type
        </Label>

        <Select
          value={value.compile_type || undefined}
          onValueChange={(v: CompileType) => handleChange("compile_type", v)}
          options={[
            { value: "PROVISIONAL", label: "Provisional" },
            { value: "FINAL", label: "Final" },
          ]}
          placeholder="Select type"
        />
      </div>
    </div>
  );
};

export default CompilationSelector;