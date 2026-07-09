// components/BulkUploadModal.tsx
import React, { useState } from "react";
import { X, Upload } from "lucide-react";

type BulkUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (fileData: any[]) => void;
  onErrors?: (errors: any[]) => void;
  title?: string;
};

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onErrors,
  title = "Bulk Upload",
}) => {
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      // Fake parse — replace with CSV/Excel parser
      const parsedData = [{ id: 1, name: "Sample Row" }];
      onSubmit(parsedData);
      setFile(null);
      onClose();
    } catch (err: any) {
      onErrors?.([err.message]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-gray-100 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Upload className="w-5 h-5 p-1 rounded bg-blue-700 text-white" />
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
          onSubmit={handleUpload}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="overflow-y-auto p-6 flex-1 flex flex-col gap-4">
            <label className="text-sm font-medium text-gray-700">
              Upload File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="border border-gray-300 rounded px-3 py-2"
            />
            {file && (
              <p className="text-sm text-gray-600">
                Selected: <strong>{file.name}</strong>
              </p>
            )}
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
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={!file}
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkUploadModal;
