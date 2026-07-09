"use client";

import { useEffect, useState, useRef } from "react";

type Option = {
  label: string;
  value: string | number;
};

type DropDownField = {
  [key: string]: {
    label: string;
    options: Option[];
  };
};

type FilterItem = {
  year: string;
  month: string;
  month_name: string;
  status: string;
};

type Props = {
  fields: DropDownField;
  setFields: React.Dispatch<React.SetStateAction<DropDownField>>;
  rawData: FilterItem[];
  onFilter: (filters: any) => void;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const padMonth = (m: string | number) => String(m).padStart(2, "0");

const uniqueMonths = (months: Option[]) => {
  const seen = new Set();
  return months.filter((m) => {
    if (seen.has(m.value)) return false;
    seen.add(m.value);
    return true;
  });
};

// Generate years from 2024 to current year
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = 2024; year <= currentYear; year++) {
    years.push({ label: year.toString(), value: year.toString() });
  }
  return years.sort((a, b) => Number(b.value) - Number(a.value));
};

export default function SelectFilter({ fields, setFields, rawData, onFilter }: Props) {
  const [filters, setFilters] = useState<any>({});
  const [monthOptions, setMonthOptions] = useState<Option[]>([]);
  const didAutoFetch = useRef(false);

  // Initialize years in filterFields if not already set
  useEffect(() => {
    if (!fields.year.options.length) {
      setFields(prev => ({
        ...prev,
        year: {
          label: "Year",
          options: generateYears(),
        }
      }));
    }
  }, []);

  useEffect(() => {
    if (rawData.length === 0) return;

    const currentYear = new Date().getFullYear().toString();
    const availableYears = [...new Set(rawData.map(d => d.year.toString()))];
    
    // Determine which year to use (current year if available, otherwise latest available)
    let defaultYear = currentYear;
    if (!availableYears.includes(currentYear) && availableYears.length > 0) {
      defaultYear = availableYears.sort((a, b) => Number(b) - Number(a))[0];
    }

    // Get all months available for the default year
    const monthsForYear = uniqueMonths(
      rawData
        .filter((d) => d.year.toString() === defaultYear)
        .map((d) => ({
          label: d.month_name || monthNames[parseInt(d.month) - 1],
          value: padMonth(d.month),
        }))
    );

    // Sort months chronologically
    const sortedMonths = monthsForYear.sort((a, b) => 
      Number(a.value) - Number(b.value)
    );

    // Get the latest month with data for this year
    const latestRecordForYear = rawData
      .filter(d => d.year.toString() === defaultYear)
      .sort((a, b) => Number(b.month) - Number(a.month))[0];

    const defaultMonth = latestRecordForYear ? padMonth(latestRecordForYear.month) : sortedMonths[sortedMonths.length - 1]?.value || "";
    
    // Get the status for the selected year and month
    const defaultRecord = rawData.find(
      d => d.year.toString() === defaultYear && padMonth(d.month) === defaultMonth
    );
    const defaultStatus = defaultRecord?.status || "P";

    const resolvedFilters = {
      year: defaultYear,
      month: defaultMonth,
      compile_type: defaultStatus,
    };

    setMonthOptions(sortedMonths);
    setFilters(resolvedFilters);

    // Auto-fetch once on load with the derived values
    if (!didAutoFetch.current) {
      didAutoFetch.current = true;
      onFilter(resolvedFilters);
    }
  }, [rawData]);

  const handleSelectChange = (field: string, value: string) => {
    setFilters((prev: any) => {
      const updated = { ...prev, [field]: value };

      if (field === "year") {
        // Get all months available for the selected year
        const months = uniqueMonths(
          rawData
            .filter((d) => d.year.toString() === value)
            .map((d) => ({
              label: d.month_name || monthNames[parseInt(d.month) - 1],
              value: padMonth(d.month),
            }))
        );
        
        // Sort months chronologically
        const sortedMonths = months.sort((a, b) => Number(a.value) - Number(b.value));
        setMonthOptions(sortedMonths);
        
        // Default to latest month available for that year
        const latestRecordForYear = rawData
          .filter(d => d.year.toString() === value)
          .sort((a, b) => Number(b.month) - Number(a.month))[0];
        
        updated.month = latestRecordForYear ? padMonth(latestRecordForYear.month) : sortedMonths[0]?.value ?? "";
        
        // Get status for the selected year and month
        const record = rawData.find(
          (d) => d.year.toString() === value && padMonth(d.month) === updated.month
        );
        if (record) updated.compile_type = record.status;
      }

      if (field === "month") {
        // Look up what status that month actually has in the DB
        const record = rawData.find(
          (d) =>
            d.year.toString() === updated.year.toString() &&
            padMonth(d.month) === value
        );
        if (record) updated.compile_type = record.status;
      }

      return updated;
    });
  };

  // Update the month options in fields for the SelectFilter component
  const resolvedFields = {
    ...fields,
    month: { label: "Month", options: monthOptions },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
      {Object.entries(resolvedFields).map(([key, field]) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="font-medium text-gray-700 text-sm">
            {field.label}
          </label>
          <select
            name={key}
            value={filters[key] ?? ""}
            onChange={(e) => handleSelectChange(key, e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select --</option>
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="flex items-end">
        <button
          onClick={() => onFilter(filters)}
          className="bg-[#265d8d] text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </div>
    </div>
  );
}