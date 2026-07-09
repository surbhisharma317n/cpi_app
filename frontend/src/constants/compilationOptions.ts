// constants/compilationOptions.ts

export type CompileType = "PROVISIONAL" | "FINAL";

export type SelectOption<T> = {
  value: T;
  label: string;
};

// ✅ Month
export const MONTH_OPTIONS: SelectOption<string>[] = [
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
];

// ✅ Type (STRICT)
export const TYPE_OPTIONS: SelectOption<CompileType>[] = [
  { value: "PROVISIONAL", label: "Provisional" },
  { value: "FINAL", label: "Final" },
];

// ✅ Year
export const getYearOptions = (): SelectOption<string>[] => {
  return Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return {
      value: year.toString(),
      label: year.toString(),
    };
  });
};