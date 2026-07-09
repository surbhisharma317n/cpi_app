import React from "react";
import { useForm } from "react-hook-form";
import type { FilterFormProps, FilterFormValues } from "../../types";

const months = [
  { value: "", label: "-- Select Month --" },
  { value: "Jan", label: "January" },
  { value: "Feb", label: "Febraury" },
  { value: "Mar", label: "March" },
  { value: "April", label: "April" },
  { value: "May", label: "may" },
  { value: "Jun", label: "June" },
  { value: "Jul", label: "July" },
  { value: "Aug", label: "August" },
  { value: "Sep", label: "September" },
  { value: "Oct", label: "October" },
  { value: "Nov", label: "November" },
  { value: "Dec", label: "December" },
  // ... other months
] as const;

const years = [
  { value: "", label: "-- Select Year --" },
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
] as const;

const compile_type = [
  { value: "", label: "-- Select Type--" },
  { value: "provisional", label: "Provisional" },
  { value: "final", label: "Final" },
] as const;

const iteration = [
  { value: "", label: "-- Select Iteration --" },
  { value: "Iter1", label: "Iter1" },
  { value: "Iter2", label: "Iter2" },
] as const;

const FilterForm: React.FC<FilterFormProps> = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FilterFormValues>({
    defaultValues: {
      compile_type:"",
      month: "",
      year: "",
      area: "",
      iteration:""
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col space-y-4 pt-3">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Year Compile Type */}
          <div className="w-full sm:w-1/2 md:w-2/5 lg:w-2/5">
            <select
              className={`w-full p-2 border rounded ${
                errors.year ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              {...register("year", { required: "Year is required" })}
            >
              {compile_type.map((compile_type) => (
                <option key={compile_type.value} value={compile_type.value}>
                  {compile_type.label}
                </option>
              ))}
            </select>
            <input type="hidden" {...register("area")} />
            {errors.compile_type && (
              <p className="mt-1 text-sm text-red-600">{errors.compile_type.message}</p>
            )}
          </div>
          {/* Month Select */}
          <div className="w-full sm:w-1/2 md:w-2/5 lg:w-2/5">
            <select
              className={`w-full p-2 border rounded ${
                errors.month ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              {...register("month", { required: "Month is required" })}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {errors.month && (
              <p className="mt-1 text-sm text-red-600">
                {errors.month.message}
              </p>
            )}
          </div>

          {/* Year Select */}
          <div className="w-full sm:w-1/2 md:w-2/5 lg:w-2/5">
            <select
              className={`w-full p-2 border rounded ${
                errors.year ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              {...register("year", { required: "Year is required" })}
            >
              {years.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
            <input type="hidden" {...register("area")} />
            {errors.year && (
              <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
            )}
          </div>

          
          {/* Iteration */}
          <div className="w-full sm:w-1/2 md:w-2/5 lg:w-2/5">
            <select
              className={`w-full p-2 border rounded ${
                errors.year ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              {...register("year", { required: "Year is required" })}
            >
              {iteration.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
            <input type="hidden" {...register("area")} />
            {errors.iteration && (
              <p className="mt-1 text-sm text-red-600">{errors.iteration.message}</p>
            )}
          </div>



          {/* Submit Button */}
          <div className="w-full sm:w-1/4 lg:w-1/5">
            <button
              type="submit"
              className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         transition-colors duration-200 flex items-center justify-center"
            >
              <i className="fas fa-search mr-2"></i>
              Retrieve
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default FilterForm;
