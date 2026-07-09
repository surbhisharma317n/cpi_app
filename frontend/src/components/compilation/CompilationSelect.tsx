import { useState } from "react";

import { Label } from "../ui2/label";
import { Select } from "../ui2/select";
import {
  getYearOptions,
  MONTH_OPTIONS,
  TYPE_OPTIONS,
  type CompileType,
} from "../../constants/compilationOptions";

const CompilationSelect = () => {
  const [compilationParams, setCompilationParams] = useState<{
    month: number;
    year: number;
    compile_type: CompileType | "";
  }>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    compile_type: "",
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Month */}
      <div className="space-y-2">
        <Label>Month</Label>
        <Select<string>
          value={compilationParams.month.toString()}
          onValueChange={(value) =>
            setCompilationParams((prev) => ({
              ...prev,
              month: parseInt(value),
            }))
          }
          options={MONTH_OPTIONS}
          placeholder="Select month"
        />
      </div>

      {/* Year */}
      <div className="space-y-2">
        <Label>Year</Label>
        <Select<string>
          value={compilationParams.year.toString()}
          onValueChange={(value) =>
            setCompilationParams((prev) => ({
              ...prev,
              year: parseInt(value),
            }))
          }
          options={getYearOptions()}
          placeholder="Select year"
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select<CompileType>
          value={compilationParams.compile_type || undefined}
          onValueChange={(value) =>
            setCompilationParams((prev) => ({
              ...prev,
              compile_type: value,
            }))
          }
          options={TYPE_OPTIONS}
          placeholder="Select type"
        />
      </div>
    </div>
  );
};

export default CompilationSelect;