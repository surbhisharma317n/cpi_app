"use client";
import { useEffect, useState } from "react";

type Option = { label: string; value: string | number };

// 🔹 Type for a single field (one dropdown)
type DropDownFieldItem = {
  label: string;
  options: Option[];
  defaultValue?: string | number;
  dependsOn?: string;
  autoUpdate?: (value: any, allValues: Record<string, any>) => any;
};

// 🔹 Type for the entire field set (object of fields)
type DropDownField = Record<string, DropDownFieldItem>;

type Props = {
  fields: DropDownField;
  onFilter: (filters: Record<string, any>) => void;
  buttonLabel?: string;
};

export default function CompileSelectFilter({
  fields,
  onFilter,
  buttonLabel = "Apply Filter",
}: Props) {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // 🧠 Initialize defaults dynamically
  useEffect(() => {
    const now = new Date();
    const prevMonthIndex = (now.getMonth() + 11) % 12;
    const dynamicDefaults: Record<string, any> = {};

    Object.entries(fields).forEach(([key, field]) => {
      if (field.defaultValue) {
        dynamicDefaults[key] = field.defaultValue;
      } else if (key.toLowerCase() === "month") {
        dynamicDefaults[key] = MONTHS[prevMonthIndex];
      } else if (key.toLowerCase() === "year") {
        dynamicDefaults[key] = now.getFullYear().toString();
      } else if (key.toLowerCase() === "compile_type") {
        dynamicDefaults[key] = "Provisional";
      } else {
        dynamicDefaults[key] = "";
      }
    });

    setFilters(dynamicDefaults);
  }, [fields]);

  // 🌀 Handle field change
  const handleSelectChange = (field: string, value: string | number) => {
    setFilters((prev) => {
      const updated = { ...prev, [field]: value };

      // handle dependencies dynamically
      Object.entries(fields).forEach(([k, f]) => {
        if (f.dependsOn === field && typeof f.autoUpdate === "function") {
          updated[k] = f.autoUpdate(value, updated);
        }
      });

      return updated;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
      {Object.entries(fields).map(([key, field]) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="font-medium text-gray-700 text-sm">
            {field.label}
          </label>

          <select
            name={key}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            value={filters[key] ?? ""}
            onChange={(e) => handleSelectChange(key, e.target.value)}
          >
            <option value="">-- Select --</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="flex items-end md:justify-end">
        <button
          className="w-full md:w-auto bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow hover:bg-blue-700 hover:shadow-md active:scale-95 transition-all"
          onClick={() => onFilter(filters)}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
