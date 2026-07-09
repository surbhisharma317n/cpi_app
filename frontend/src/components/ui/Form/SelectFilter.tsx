"use client";
import { useEffect, useState } from "react";

type Option = { label: string; value: string | number };

type DropDownField = {
  [key: string]: {
    label: string;
    options: Option[];
  };
};

type Props = {
  fields: DropDownField;
  onFilter: (filters: any) => void;
};

export default function SelectFilter({ fields, onFilter }: Props) {
  const [filters, setFilters] = useState<any>({});

  const MONTHS = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];

  useEffect(() => {
    const d = new Date();
    const prevMonthIndex = d.getMonth(); // smart wrap for Jan->Dec
    const year = d.getFullYear().toString();

    setFilters({
      month: MONTHS[prevMonthIndex],
      year,
      compile_type: "Provisional",
    });
  }, [fields]); 

  const handleSelectChange = (field: string, value: string) => {
    setFilters((p: any) => {
      const updated = { ...p, [field]: value };

      if (field === "month") {
        const d = new Date();
        const currentMonth = d.getMonth(); // 0-11
        const selectedIndex = MONTHS.indexOf(value);
        const threshold = currentMonth - 2;

        updated.compile_type =
          selectedIndex <= threshold ? "Final" : "Provisional";
      }

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
            value={filters[key] || ""}
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

      <div className="flex items-end md:justify-start">
        <button
          className="w-full md:w-auto bg-[#265d8d] text-white font-semibold py-2 px-6 rounded-lg shadow hover:bg-blue-700 hover:shadow-md active:scale-95 transition-all"
          onClick={() => onFilter(filters)}
        >
          Search
        </button>
      </div>
    </div>
  );
}
