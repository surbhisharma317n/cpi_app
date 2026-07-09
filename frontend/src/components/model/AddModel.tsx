// components/AddModal.tsx
import React, { useState } from "react";
import InputField from "../ui/Form/InputField";
import { X, PlusCircle } from "lucide-react";


type InputType = React.HTMLInputTypeAttribute | "textarea";

type Field = {
  name: string;
  label: string;
  type?: InputType;
  required?: boolean;
  placeholder?: string;
};

type AddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => void;
  fields: Field[];
  title?: string;
};

const AddModal: React.FC<AddModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  fields,
  title = "Add Data",
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-gray-100 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <PlusCircle className="w-5 h-5 p-1 rounded bg-green-700 text-white" />
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
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

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddModal;
