// components/model/AddData.tsx
import React, { useState } from "react";

import BulkUploadModal from "./BulkUpload";
import { FaPlus, FaUpload } from "react-icons/fa";

import ModalWrapper from "./ModalWrapper";

type ColumnField = {
  accessorKey: string;
  header: string;
  inputType?: string;
};

type AddDataProps = {
  columns: ColumnField[];
  onAddRow: (row: Record<string, any>) => void;
  onBulkUploadErrors?: (errors: any[]) => void;
};

const AddData: React.FC<AddDataProps> = ({ columns, onAddRow, onBulkUploadErrors }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Convert columns to fields for AddModal
  const fields = columns.map((col) => ({
    name: col.accessorKey,
    label: col.header,
    type: col.inputType || "text",
    required: true,
  }));

  const handleAddRowSubmit = (row: Record<string, string>) => {
    onAddRow(row);
  };

  const handleBulkUploadSubmit = (fileData: any[]) => {
    console.log("Bulk Upload Data:", fileData);
    // Call API or handle upload
  };

  return (
    <div className="flex gap-2">
      {/* Add Row Button */}
     {/* Add Row Button */}
<button
  onClick={() => setIsAddModalOpen(true)}
  className="
    flex items-center gap-2
    px-4 py-2
    rounded-md shadow-md
    bg-blue-900 hover:bg-blue-800
    text-white
    dark:bg-gray-600 dark:hover:bg-gray-700
  "
>
  <FaPlus />
  Add Row
</button>

{/* Bulk Upload Button */}
<button
  onClick={() => setIsBulkModalOpen(true)}
  className="
    flex items-center gap-2
    px-4 py-2
    rounded-md shadow-md
    bg-blue-900 hover:bg-blue-800
    text-white
    dark:bg-gray-600 dark:hover:bg-gray-700
  "
>
  <FaUpload />
  Bulk Upload
</button>

      

      <ModalWrapper
  isOpen={isAddModalOpen}
  onClose={() => setIsAddModalOpen(false)}
  onSubmit={handleAddRowSubmit}
  fields={fields}
  title="User"
  mode="add"
/>


      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSubmit={handleBulkUploadSubmit}
        onErrors={onBulkUploadErrors}
      />
    </div>
  );
};

export default AddData;
