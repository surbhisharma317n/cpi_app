// components/ModalWrapper.tsx
import React, { useState, useEffect } from "react";
import InputField from "../ui/Form/InputField";
import { X, PlusCircle, Edit3 } from "lucide-react";

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
};

type ModalWrapperProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => void;
  fields: Field[];
  initialData?: Record<string, string>; // optional, only for edit
  title?: string;
  mode: "add" | "edit";
};

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  onSubmit,
  fields,
  initialData,
  title,
  mode,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setFormData(initialData);
      } else {
        const emptyData: Record<string, string> = {};
        fields.forEach((field) => (emptyData[field.name] = ""));
        setFormData(emptyData);
      }
    }
  }, [isOpen, fields, initialData, mode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({});
    onClose();
  };

  // Config based on mode
  const isEdit = mode === "edit";
  const icon = isEdit ? (
    <Edit3 className="w-5 h-5 p-1 rounded bg-blue-900 text-white" />
  ) : (
    <PlusCircle className="w-5 h-5 p-1 rounded bg-green-700 text-white" />
  );

  const actionLabel = isEdit ? "Update" : "Save";
  const actionColor = isEdit
    ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
    : "bg-green-600 hover:bg-green-700 focus:ring-green-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 ">
      <div className="bg-gray-100 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {icon} {isEdit ? "Edit" : "Add"}{" "}
            {title ? " " + title : ""}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Scrollable Body */}
          <div className="overflow-y-auto p-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <InputField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  type={field.type as any}
                
                />
              ))}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl shadow-sm">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-red-500 border border-red-600 rounded-md hover:bg-red-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`inline-flex items-center px-5 py-2.5 text-sm font-medium text-white rounded-md shadow-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${actionColor}`}
            >
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalWrapper;
