// Input.tsx
import React, {type  InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="mb-1 font-medium text-gray-700">{label}</label>}
      <input
        className={`border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${error ? "border-red-500" : "border-gray-300"}`}
        {...props}
      />
      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
    </div>
  );
};
