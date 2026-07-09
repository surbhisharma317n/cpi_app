"use client";
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type InputType =
  | "text"
  | "number"
  | "date"
  | "email"
  | "password"
  | "file"
  | "checkbox"
  | "radio"
  | "textarea"
  | "select"
  | "switch"
  | "custom";

type InputOption = {
  label: string;
  value: string | number | boolean;
};

type ValidationRule = {
  required?: boolean;
  min?: number | string;
  max?: number | string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
};

type InputFieldProps = {
  name: string;
  label?: string;
  value: any;
  onChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
      | any
  ) => void;
  type?: InputType;
  placeholder?: string;
  options?: InputOption[];
  accept?: string;
  checked?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  customComponent?: React.ReactNode;
  validation?: ValidationRule;
  error?: string;
  setError?: (field: string, message: string | null) => void;
};

const InputField: React.FC<InputFieldProps> = ({
  name,
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  options = [],
  accept,
  checked,
  disabled = false,
  multiple = false,
  customComponent,
  validation,
  error,
  setError,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const required = validation?.required || false;

  const baseInputClass =
    "w-full px-3 pt-5 pb-2 text-sm bg-transparent border rounded-md focus:outline-none transition-all duration-200 focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed dark:text-gray-100";
  const errorClass = error
    ? "border-red-500 focus:ring-red-500"
    : "border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500";

  /** ✅ Validation Logic */
  const validate = (val: any) => {
    if (!validation) return null;
    const { required, min, max,  pattern, custom } =
      validation;

    if (required && (val === "" || val === null || val === undefined))
      return "This field is required.";

    if (min !== undefined && type === "number" && Number(val) < Number(min))
      return `Minimum value is ${min}.`;

    if (max !== undefined && type === "number" && Number(val) > Number(max))
      return `Maximum value is ${max}.`;

    if (pattern && val && !pattern.test(val)) return "Invalid format.";

    if (custom) {
      const msg = custom(val);
      if (msg) return msg;
    }
    return null;
  };

  /** ✅ Handlers */
  const handleChange = (e: any) => {
    const newVal =
      e?.target?.type === "checkbox"
        ? e.target.checked
        : (e?.target?.value ?? e);
    onChange(e);
    if (setError) setError(name, validate(newVal));
  };

  const handleDateChange = (date: Date | null) => {
    const newVal = date ? date.toISOString().split("T")[0] : "";
    onChange({ target: { name, value: newVal } });
    if (setError) setError(name, validate(newVal));
  };

  const handleToggle = () => {
    const newVal = !value;
    onChange({ target: { name, value: newVal } });
    if (setError) setError(name, validate(newVal));
  };

  const showFloating = isFocused || value || type === "date";

  /** ✅ UI Rendering */
  return (
    <div className="mb-6 relative">
      {/* 🧩 Custom Component */}
      {type === "custom" && customComponent ? (
        customComponent
      ) : type === "textarea" ? (
        <div className="relative">
          <textarea
            id={name}
            name={name}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`${baseInputClass} ${errorClass} resize-none h-28`}
          />
          {label && (
            <label
              htmlFor={name}
              className={`absolute left-3 top-2.5 text-gray-500 text-sm transition-all duration-200 ${
                showFloating
                  ? "text-xs -translate-y-3 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 px-1"
                  : ""
              }`}
            >
              {label}
              {required && <span className="text-red-500">*</span>}
            </label>
          )}
        </div>
      ) : type === "select" ? (
        <div className="relative">
          <select
            id={name}
            name={name}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            multiple={multiple}
            disabled={disabled}
            required={required}
            className={`${baseInputClass} ${errorClass} appearance-none pr-8`}
          >
            <option value="">Select option</option>
            {options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
          {label && (
            <label
              htmlFor={name}
              className={`absolute left-3 top-2.5 text-gray-500 text-sm transition-all duration-200 ${
                showFloating
                  ? "text-xs -translate-y-3 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 px-1"
                  : ""
              }`}
            >
              {label}
              {required && <span className="text-red-500">*</span>}
            </label>
          )}
        </div>
      ) : type === "checkbox" || type === "radio" ? (
        <div className="flex flex-wrap gap-3 mt-1">
          {options.length > 0 ? (
            options.map((opt) => (
              <label
                key={String(opt.value)}
                className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300"
              >
                <input
                  type={type}
                  name={name}
                  value={String(opt.value)}
                  checked={value === opt.value}
                  onChange={handleChange}
                  disabled={disabled}
                  className="h-4 w-4 accent-blue-600"
                />
                {opt.label}
              </label>
            ))
          ) : (
            <input
              type={type}
              name={name}
              checked={checked}
              onChange={handleChange}
              disabled={disabled}
              className="h-4 w-4 accent-blue-600"
            />
          )}
        </div>
      ) : type === "switch" ? (
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
            value ? "bg-blue-600" : "bg-gray-400"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      ) : type === "date" ? (
        <div className="relative">
          <DatePicker
            selected={value ? new Date(value) : null}
            onChange={handleDateChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`${baseInputClass} ${errorClass}`}
            dateFormat="yyyy-MM-dd"
            required={required}
          />
          {label && (
            <label
              htmlFor={name}
              className={`absolute left-3 top-2.5 text-gray-500 text-sm transition-all duration-200 ${
                showFloating
                  ? "text-xs -translate-y-3 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 px-1"
                  : ""
              }`}
            >
              {label}
              {required && <span className="text-red-500">*</span>}
            </label>
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            type={type}
            id={name}
            name={name}
            value={type === "file" ? undefined : value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            placeholder={placeholder}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            required={required}
            className={`${baseInputClass} ${errorClass}`}
          />
          {label && (
            <label
              htmlFor={name}
              className={`absolute left-3 top-2.5 text-gray-500 text-sm transition-all duration-200 ${
                showFloating
                  ? "text-xs -translate-y-3 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 px-1"
                  : ""
              }`}
            >
              {label}
              {required && <span className="text-red-500">*</span>}
            </label>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-500 mt-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default InputField;
