import { useState } from "react";
import { motion } from "framer-motion";
import { Filter } from "lucide-react";
import CompileSelectFilter from "./compileSelect";
type Props = {
  dropDownField: any;
  handleFilter: (filters: Record<string, any>) => void;
};

export default function FilterSection({ dropDownField, handleFilter }: Props) {
  const [showFilter, setShowFilter] = useState(true);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden">
      <div
        className={`transition-all duration-500 flex items-center gap-4 p-5`}
      >
        {/* Filter Icon — toggles visibility */}
        <Filter
          className={`h-5 w-5 text-blue-600 cursor-pointer transition-transform duration-300 ${
            showFilter ? "rotate-0" : "-rotate-90"
          }`}
          onClick={() => setShowFilter((prev) => !prev)}
        />

        {/* Filter Form (collapsible) */}
        <motion.div
          initial={false}
          animate={{
            width: showFilter ? "100%" : 0,
            opacity: showFilter ? 1 : 0,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="overflow-hidden flex-1"
        >
          {showFilter && (
            <div className="flex-1">
              <CompileSelectFilter
                fields={dropDownField}
                onFilter={handleFilter}
                buttonLabel="Compile"
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
