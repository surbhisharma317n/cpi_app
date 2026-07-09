import React from "react";

type InputFieldProps = {
  name: string;
  label: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  type?: "text" | "number" | "date" | "select";
  placeholder?: string;
  options?: string[]; // For select dropdowns
  error?: string;
};

const InputField: React.FC<InputFieldProps> = ({
  name,
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  options = [],
  error,
}) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}
      </label>

      {type === "select" ? (
        <select
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          className={`w-full px-3 py-2 border rounded ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
      )}

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default InputField;
